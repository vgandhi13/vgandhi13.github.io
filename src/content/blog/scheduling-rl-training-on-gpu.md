---
title: Scheduling Reinforcement Learning training on GPU 1.7x Better
description: Rearranging when each GPU does inference versus backward work made a simulated
  async GRPO training loop 1.73x faster, without dropping a single optimizer step.
date: 2026-08-27
draft: false
---

**Note:** This was an Async RL simulation project and actual GPUs were not used. Everything runs in a Python simulator where GPU work is `asyncio.sleep()` calls.

What is real is the scheduling problem. The simulator enforces the same
constraints a real setup has, and the fix, rearranging when each GPU does
each piece of work, is the same fix that helps on real hardware. Whether it
would give the same 1.7x on real GPUs, I cannot say. I did not test that.

With that said, here is the problem and how I solved it.

## The setup

GRPO is a way of training AI models. You don't need to know GRPO. Here is all
the simulator asks you to care about:

We have 12,800 **rollouts**. A rollout is one piece of training data. Every
rollout must go through two steps, in order:

1. **Inference**: the model writes an answer. This takes 50 to 600 ms.
   The time is random. Some rollouts are fast, some are slow.
2. **Backward**: the model learns from that answer. This takes about 230 ms.

After 256 rollouts finish both steps, we do an **optimizer step**. This is the
moment the model actually gets better. We call the number of optimizer steps so
far the **version**. Version 5 means the model has improved 5 times.

We have 4 GPUs. Each GPU has 64 **slots**, so it can run 64 inferences at the
same time. But there is one rule that makes this hard:

> **A GPU can do inference OR backward. Never both at the same time.**

When a GPU starts a backward pass, it takes over the whole GPU. All 64 slots.
Nothing else can run on it until that backward pass is done.

## The slow way

The starting code does the obvious thing. For each group of 256 rollouts:

1. All 4 GPUs run inference on all 256 rollouts. Wait for all of them.
2. All 4 GPUs run backward on all 256 rollouts. Wait for all of them.
3. Do one optimizer step.
4. Repeat.

This works. It is also slow, for three reasons.

**Reason 1: Waiting for the slowest one.**
Inference times are random, from 50 ms to 600 ms. Step 1 says "wait for all
256." So a slot that finishes a 50 ms rollout just sits there doing nothing,
waiting for some other slot to finish its 600 ms rollout. Most slots spend most
of their time waiting.

**Reason 2: Half the machine is always idle.**
In step 1, all 4 GPUs do inference. In step 2, all 4 GPUs do backward. So
during step 1, zero GPUs are doing backward work. During step 2, zero GPUs are
doing inference. Each stage waits for the other to finish.

**Reason 3: No overlap between groups.**
Group 2 cannot start until group 1 is completely done. So the pipeline drains
to empty 50 times.

## The fast way

Three changes fix all three problems.

**Change 1: Give GPUs fixed jobs.**
Instead of everyone switching between jobs, 2 GPUs only do inference and 2 GPUs
only do backward. Now both kinds of work happen at the same time, always.

**Change 2: Refill each slot on its own.**
Don't wait for all 256. The moment one slot finishes its rollout, that slot
grabs the next one and starts. A fast rollout no longer waits for a slow one.
This alone removes most of the idle time.

**Change 3: Let rollouts finish in any order.**
This is the key idea. Nothing says rollout #5 must be in the first group of
256. The rules only say: every rollout gets recorded exactly once, and each
optimizer step gets exactly 256 of them.

So instead of fixed groups, I use a pool. Rollouts finish inference and drop
into the pool in whatever order they finish. Backward GPUs grab 64 at a time
from the pool. When 256 have finished backward, that becomes a group and we do
an optimizer step.

A slow rollout does not block anyone now. It just lands in a later group.

Here is the whole thing:

<figure class="wide">
  <img src="/images/blog/train_async_diagram.svg"
       alt="Diagram of the train_async pipeline: rollouts flow through an admission gate to inference GPUs, into a ready pool, then to backward GPUs and record(), with feedback loops for model version, backpressure, and starvation rescue." />
</figure>

**Reading the diagram:** solid arrows are the path every rollout takes. The
blue arrow is the model version going back to inference. The dashed orange
arrows are the rescue path, explained below.

## The tricky part: keeping data fresh

There is one more rule I have not mentioned, and it almost broke everything.

When we do an optimizer step, the model only actually improves if the group
contains at least one rollout that was made by the **current** version of the
model. This makes sense in real training: if you only learn from answers
written by an old version of the model, you are not really learning from
yourself anymore.

Here is the trap. My fast version runs inference far ahead of the optimizer.
If I let it run too far ahead, this happens:

```text
All 12,800 rollouts get generated by version 0 of the model.
Step 1: has a version-0 rollout, and we are on version 0. OK, improve to v1.
Step 2: needs a version-1 rollout. Doesn't exist. No improvement.
Step 3: needs a version-2 rollout. Doesn't exist. No improvement.
...
Final result: the model improved 1 time out of 50.
```

The job would finish fast and be completely useless. So speed and freshness
pull against each other. Running ahead is what makes it fast, but running too
far ahead makes the training worthless.

I solved it with three small mechanisms.

**A limit on how far ahead we run.** At most 512 rollouts can be "in the
pipeline" at once. That is 2 groups worth. When the pipeline is full, inference
just waits. This keeps generation close behind training. A nice side effect: I
measured it, and no rollout is ever more than 1 version out of date.

**Pick the freshest one for each group.** Every rollout remembers which version
made it. Since I am allowed to put any 256 rollouts in a group, before each
optimizer step I look through the finished pool, find the freshest rollout, and
make sure it is in this group. Because there are always ~128 inferences
running, something almost always finished after the last optimizer step. So
freshness is usually free.

**A rescue path for when it isn't.** Sometimes every finished rollout is old.
Then the group refuses to record itself. It puts up a flag saying "I am waiting
for version N." Two things then happen: a backward GPU wakes up and rushes the
needed rollout through, even if that means an inefficient half-empty pass. And
one extra inference is allowed past the limit, in case the fresh rollout does
not exist yet. This is the dashed orange path in the diagram.

That last one matters more than it looks. Without it there is a deadlock: the
optimizer waits for a fresh rollout, but a fresh rollout needs a free slot, and
slots only free up when the optimizer records a group.

## Results

Same simulated 4 GPUs, same 12,800 rollouts, same work. The times below are
what the simulator reports if you scale its numbers up to real-world speed.
The actual program run takes under a second either way.

| | Simulated time | Speed | Model improved |
|---|---|---|---|
| Original | 731 minutes | 17.5 rollouts/min | 50 out of 50 |
| Rewritten | 422 minutes | 30.3 rollouts/min | 50 out of 50 |

**1.73x faster**, and the model still improves after every single group. Not
44 out of 50, not 48 out of 50. All 50.

The ratio is the part worth trusting. The minutes are made up by the simulator;
the 1.73x is a real measurement of how much less waiting the new schedule does.

## What I would tell someone starting this

**Look for barriers.** Every "wait for all of these to finish" in your code is
a place where fast workers wait for slow ones. Most of my speedup came from
deleting barriers, not from clever code.

**Read the rules for freedom, not just limits.** The rules said each optimizer
step needs exactly 256 rollouts. They never said which 256. That one gap is
where the whole design came from. When something feels forced, check whether
it is actually required or just how the example happened to do it.

**Measure, do not guess.** I built a second version of this using a different
design (a replay buffer, closer to how real systems do it). I assumed it would
be similar in speed. It was much slower, 1.44x instead of 1.78x, because it
locks each rollout to a specific group ahead of time, so every group ends up
waiting for its own slow rollouts. Two versions that look similar on a
whiteboard were 20% apart in practice.

**Test the weird cases.** I ran the code with 1 GPU, 7 GPUs, 1 slot per GPU,
huge groups, tiny groups, and 30 repeats looking for random timing bugs. No
crashes and no lost data anywhere. But I did find one real limit: if a single
backward pass can hold more than a whole group, the first pass dumps several
groups worth of old data at once and the model loses 2 or 3 improvements at the
very start. It never shows up in the normal setup, but it is real, and I only
found it by trying silly numbers.

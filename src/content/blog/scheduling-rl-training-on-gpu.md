---
title: Scheduling Reinforcement Learning Training 1.73x Better
description: A simulation comparing synchronized and asynchronous GRPO training. Overlapping
  inference and backward work made the simulated loop 1.73x faster while preserving every
  optimizer step.
date: 2026-08-27
updated: 2026-08-29
draft: false
---

**Note:** This is a simulation. No real GPUs were used. GPU work is represented by `asyncio.sleep()`.

The interesting part is the scheduling problem. I wanted to see how much time we could save by
changing *when* each GPU does inference and backward work, without changing the training rules.

## The setup

You don't need to know much about GRPO for this. The simulator has:

- **12,800 rollouts**, each producing one piece of training data.
- **4 GPUs**, with 64 slots each.
- **Inference**, which takes 50–600 ms depending on the rollout.
- **Backward**, which takes about 230 ms.
- An **optimizer step every 256 rollouts**.

There is one constraint that drives the whole design:

> **A GPU can do inference or backward, but never both at once.**

Backward takes all 64 GPU slots, so while it is running, that GPU is completely occupied.

<figure>
  <svg viewBox="0 0 900 250" role="img" aria-label="Comparison of synchronized and asynchronous training schedules">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="currentColor"/>
      </marker>
    </defs>
    <text x="40" y="28" font-size="17" font-weight="600" fill="currentColor">Synchronous</text>
    <text x="40" y="50" font-size="12" fill="currentColor">finish a whole batch before moving on</text>
    <text x="475" y="28" font-size="17" font-weight="600" fill="currentColor">Asynchronous</text>
    <text x="475" y="50" font-size="12" fill="currentColor">overlap the stages</text>
    <g font-size="11" fill="currentColor">
      <text x="40" y="82">GPU 0</text><text x="40" y="117">GPU 1</text><text x="40" y="152">GPU 2</text><text x="40" y="187">GPU 3</text>
      <text x="475" y="82">GPU 0</text><text x="475" y="117">GPU 1</text><text x="475" y="152">GPU 2</text><text x="475" y="187">GPU 3</text>
    </g>
    <g>
      <rect x="105" y="65" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="185" y="65" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="265" y="65" width="80" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="345" y="65" width="80" height="25" rx="4" fill="var(--diagram-purple)" stroke="var(--diagram-purple-border)"/>
      <rect x="105" y="100" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="185" y="100" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="265" y="100" width="80" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="345" y="100" width="80" height="25" rx="4" fill="var(--diagram-purple)" stroke="var(--diagram-purple-border)"/>
      <rect x="105" y="135" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="185" y="135" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="265" y="135" width="80" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="345" y="135" width="80" height="25" rx="4" fill="var(--diagram-purple)" stroke="var(--diagram-purple-border)"/>
      <rect x="105" y="170" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="185" y="170" width="80" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="265" y="170" width="80" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="345" y="170" width="80" height="25" rx="4" fill="var(--diagram-purple)" stroke="var(--diagram-purple-border)"/>
      <text x="118" y="82" font-size="11">Inference</text><text x="280" y="82" font-size="11">Backward</text><text x="359" y="82" font-size="11">Step</text>
      <text x="105" y="218" font-size="11" fill="var(--text-muted)">wait → wait → step → repeat</text>
    </g>
    <g>
      <rect x="540" y="65" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="610" y="65" width="70" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="680" y="65" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="750" y="65" width="70" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="570" y="100" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="640" y="100" width="70" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="710" y="100" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="780" y="100" width="70" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="600" y="135" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="670" y="135" width="70" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <rect x="740" y="135" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="630" y="170" width="70" height="25" rx="4" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
      <rect x="700" y="170" width="70" height="25" rx="4" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
      <text x="545" y="82" font-size="10">I</text><text x="615" y="82" font-size="10">B</text>
      <text x="575" y="117" font-size="10">I</text><text x="645" y="117" font-size="10">B</text>
      <text x="605" y="152" font-size="10">I</text><text x="675" y="152" font-size="10">B</text>
      <text x="635" y="187" font-size="10">I</text><text x="705" y="187" font-size="10">B</text>
      <text x="540" y="218" font-size="11" fill="var(--text-muted)">inference and backward stay busy together</text>
    </g>
  </svg>
  <figcaption>Same work, different schedule. The async version removes the large stage barriers.</figcaption>
</figure>

## The synchronous version

The baseline is straightforward. For each group of 256:

1. Run inference for all 256 rollouts.
2. Wait for all of them.
3. Run backward.
4. Wait again.
5. Take the optimizer step.

The problem is the waiting.

Inference latency varies from 50 to 600 ms. If one rollout takes 600 ms, the slots that finished
in 50 ms sit idle until it does. Then the entire machine switches to backward, so no inference
happens during that time.

There is also no overlap between batches: batch 2 cannot start until batch 1 is completely
finished.

## The asynchronous version

I changed the schedule rather than the work.

1. **Split the GPUs.** Two GPUs handle inference and two handle backward.
2. **Refill slots immediately.** When an inference finishes, that worker takes another rollout
   instead of waiting for the rest of the batch.
3. **Use a pool.** Finished inference goes into a `ready` queue. Backward workers pull chunks of
   up to 64 from it.
4. **Optimize every 256 completed rollouts.** They do not have to be the same 256 that started
   together.

<figure>
  <svg viewBox="0 0 900 230" role="img" aria-label="Async RL pipeline with inference, ready queue, backward, done queue and optimizer">
    <defs>
      <marker id="arrow2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="currentColor"/>
      </marker>
    </defs>
    <g font-size="14" font-weight="600" fill="currentColor">
      <text x="35" y="35">Inference</text>
      <text x="235" y="35">Ready</text>
      <text x="410" y="35">Backward</text>
      <text x="610" y="35">Done</text>
      <text x="775" y="35">Optimizer</text>
    </g>
    <g font-size="12" fill="var(--text-muted)">
      <text x="35" y="55">2 GPUs × 64 slots</text>
      <text x="235" y="55">finished inference</text>
      <text x="410" y="55">chunks ≤ 64</text>
      <text x="610" y="55">finished backward</text>
      <text x="775" y="55">256 rollouts</text>
    </g>
    <rect x="25" y="75" width="145" height="75" rx="7" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
    <rect x="215" y="75" width="125" height="75" rx="7" fill="var(--surface)" stroke="var(--border)"/>
    <rect x="390" y="75" width="145" height="75" rx="7" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)"/>
    <rect x="585" y="75" width="125" height="75" rx="7" fill="var(--surface)" stroke="var(--border)"/>
    <rect x="760" y="75" width="115" height="75" rx="7" fill="var(--diagram-purple)" stroke="var(--diagram-purple-border)"/>
    <g font-size="12" fill="currentColor">
      <text x="43" y="102">R1  R2  R3  R4 ...</text>
      <text x="43" y="124">run as they arrive</text>
      <text x="240" y="105">R2</text><text x="270" y="105">R4</text><text x="300" y="105">R7...</text>
      <text x="240" y="127">queue</text>
      <text x="412" y="105">64 at a time</text>
      <text x="412" y="127">GPU gets all slots</text>
      <text x="610" y="105">R1...R256</text>
      <text x="610" y="127">accumulate</text>
      <text x="778" y="105">step</text>
      <text x="778" y="127">model + 1</text>
    </g>
    <path d="M170 112 H210" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow2)"/>
    <path d="M340 112 H385" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow2)"/>
    <path d="M535 112 H580" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow2)"/>
    <path d="M710 112 H755" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow2)"/>
    <path d="M820 160 C820 205 105 205 105 160" fill="none" stroke="var(--diagram-purple-border)" stroke-width="1.5" stroke-dasharray="5 5" marker-end="url(#arrow2)"/>
    <text x="355" y="215" font-size="11" fill="var(--text-muted)">new model version feeds the next inference</text>
  </svg>
  <figcaption>The important change is that the queues absorb differences in latency instead of turning them into barriers.</figcaption>
</figure>

## The catch: don't run too far ahead

There is a subtle failure mode. Rollouts remember which model version produced them. If
inference gets too far ahead, it can generate almost everything with version 0.

```text
Step 1: version-0 rollout → update to v1
Step 2: needs a v1 rollout → none available
Step 3: needs a v2 rollout → none available
...
```

That would be fast, but the model would only update once.

So the async loop has a few guardrails.

**Admission cap.** At most 512 rollouts are in flight with the default setup:

```text
256 batch slots + (4 GPUs × 64 slots)
= 512
```

As the end of the rollout list approaches, the cap follows the amount of work remaining, with a
minimum of `batch_size + slots_per_gpu`.

**Freshest-first.** Before an optimizer step, the code looks at the completed rollouts and makes
sure the freshest available version is in the 256-rollout batch.

**Rescue.** If the optimizer is waiting for a newer version, the pipeline temporarily allows an
extra inference and prioritizes the rollout that can unblock the optimizer. Without this, the
pipeline can deadlock: the optimizer waits for fresh data, while fresh data cannot be generated
because the admission limit is full.

<figure>
  <svg viewBox="0 0 900 190" role="img" aria-label="Backpressure and freshness rescue in asynchronous RL">
    <defs>
      <marker id="arrow3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="currentColor"/>
      </marker>
    </defs>
    <rect x="25" y="55" width="180" height="70" rx="7" fill="var(--diagram-green)" stroke="var(--diagram-green-border)"/>
    <rect x="270" y="55" width="180" height="70" rx="7" fill="var(--surface)" stroke="var(--border)"/>
    <rect x="515" y="55" width="160" height="70" rx="7" fill="var(--diagram-purple)" stroke="var(--diagram-purple-border)"/>
    <rect x="735" y="55" width="140" height="70" rx="7" fill="var(--diagram-orange)" stroke="var(--diagram-orange-border)"/>
    <g font-size="13" font-weight="600" fill="currentColor">
      <text x="65" y="82">Inference</text>
      <text x="310" y="82">≤ 512 in flight</text>
      <text x="555" y="82">Optimizer waits</text>
      <text x="760" y="82">Rescue</text>
    </g>
    <g font-size="11" fill="var(--text-muted)">
      <text x="48" y="104">generate new versions</text>
      <text x="302" y="104">backpressure</text>
      <text x="550" y="104">for a fresh rollout</text>
      <text x="752" y="104">admit one more</text>
    </g>
    <path d="M205 90 H265" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow3)"/>
    <path d="M450 90 H510" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow3)"/>
    <path d="M675 90 H730" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow3)"/>
    <path d="M805 130 C805 165 115 165 115 130" fill="none" stroke="var(--diagram-orange-border)" stroke-width="1.5" stroke-dasharray="5 5" marker-end="url(#arrow3)"/>
    <text x="355" y="177" font-size="11" fill="var(--text-muted)">fresh rollout moves through the pipeline and unblocks the step</text>
  </svg>
  <figcaption>The cap keeps generation close to training; the rescue path handles the rare case where it falls behind on model version.</figcaption>
</figure>

## Results

Same simulated hardware, same 12,800 rollouts, same optimizer requirements.

| | Simulated time | Throughput | Model updates |
|---|---|---|---|
| Original | 731 min | 17.5 rollouts/min | 50 / 50 |
| Async | 422 min | 30.3 rollouts/min | 50 / 50 |

**1.73x faster.** All 12,800 rollouts were processed and all 50 optimizer steps happened.

The absolute minutes are simulator numbers, so I would not read them as a prediction for real
hardware. The useful measurement is the **1.73x reduction in simulated wall-clock time**.

## What I learned

**Look for barriers.** The biggest win came from removing "wait for everything" points, not from
complicated code.

**Separate requirements from implementation.** The rule was "256 rollouts per optimizer step."
It did not say which 256. That gave us room to build a pool instead of fixed batches.

**Measure the schedule.** I also tried a replay-buffer design. It looked similar on paper but
was slower: 1.44x instead of 1.78x in that run, because it tied rollouts to groups and
reintroduced stragglers.

**Test strange configurations.** I tried 1 GPU, 7 GPUs, 1 slot per GPU, very large groups, tiny
groups, and repeated runs. That exposed an edge case where a backward pass larger than a whole
group can cause several early model updates to be skipped.

<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 1rem 1.25rem;">

**The takeaway:** the algorithm did not get faster because the GPUs became faster. It got
faster because they spent less time waiting for one another.

</div>

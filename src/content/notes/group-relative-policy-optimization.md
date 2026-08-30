---
title: Reinforcement Learning for Large Language Models
description: Notes on RL methods for training LLMs, including GRPO, the critic-free policy gradient method behind recent reasoning models.
date: 2026-07-30
updated: 2026-08-29
---

Yann LeCun has described intelligence with a cake analogy: "If intelligence is a cake, the bulk
of the cake is unsupervised learning, the icing on the cake is supervised learning, and the
cherry on the cake is reinforcement learning (RL)."

Conventional LLMs typically go through a three-step training pipeline:

1. **Pre-training.** Self-supervised learning on vast swaths of internet data makes up the
   majority of the cake, especially when viewed in compute spent (FLOPs).
2. **Supervised fine-tuning (SFT).** The beginning of post-training.
3. **Reinforcement learning.** Used for alignment and for creating "reasoning" or "thinking"
   models, via RLHF (Reinforcement Learning from Human Feedback) or RLVR (Reinforcement Learning
   with Verifiable Rewards).

## Reinforcement Learning from Human Feedback (RLHF)

TODO: will update this section later.

## Reinforcement Learning with Verifiable Rewards (RLVR)

The training method for these models, Reinforcement Learning with Verifiable Rewards
(RLVR)[^rlvr], proceeds very similarly to RLHF, but it makes the reward model optional in lieu
of a scoring function that returns a positive reward when the answer is correct and 0 otherwise.
This can be seen as an RL feedback loop where, instead of a reward model, a verification
function scores the agent's completions.

<figure>
  <img src="/images/notes/rlvr-feedback-loop.png" alt="RLVR feedback loop diagram: training data provides prompts to an agent (policy pi-theta), which produces completions; a Verifiable Reward block scores the completion (reward = gamma if correct, else 0) and feeds the scalar reward back to the agent for a policy update" />
  <figcaption>RLVR as an RL feedback loop: a verification function stands in for the reward model. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

See below to see how different it is to score responses for RLHF versus RLVR. In RLHF, a reward
model must evaluate subjective qualities. In contrast, RLVR uses verification functions that
return definitive scores.

<div class="figure-row">

<figure>
  <img src="/images/notes/rlhf-scoring-example.png" alt="RLHF example: a prompt asking to explain opportunity cost in economics, with an open-ended prose response and no verification step, since a reward model must judge subjective quality" />
  <figcaption>RLHF: scoring is a subjective judgment call. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

<figure>
  <img src="/images/notes/rlvr-scoring-example.png" alt="RLVR example: a prompt asking for the sum of primes less than 20, with a response boxing the final answer 77, verified by the check extracted_answer == 77 giving Reward = 1" />
  <figcaption>RLVR: scoring is a definitive check against the extracted answer. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

</div>

<figure>
  <img src="/images/notes/rlvr-code-scoring-example.png" alt="RLVR example for code generation: a prompt asking for a Python Fibonacci function, verified by unit tests (fib(0) == 0, fib(1) == 1, fib(10) == 55), all passing for Reward = 1" />
  <figcaption>RLVR for code generation: verification via unit tests. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

As mentioned before, PPO was the original algorithm used in RLHF.

## Group Relative Policy Optimization (GRPO)

From a technical standpoint, it works perfectly fine to use PPO in the RL pipeline used to
develop reasoning models. However, DeepSeek-R1's RL pipeline instead used an algorithm called
Group Relative Policy Optimization (GRPO), introduced as a variant of Proximal Policy
Optimization (PPO) that improves mathematical reasoning ability while reducing PPO's memory
footprint.

GRPO shares a very similar surrogate loss to PPO, but avoids learning a value function, which
would otherwise require keeping another copy of the policy language model in memory just to
estimate value. This sidesteps two problems: the difficulty of learning a value function from an
LM backbone, and the memory cost of storing that extra set of model weights.

GRPO does this by simplifying value estimation: instead of a learned value function, it assigns
the same baseline to every token in an episode, estimated via a Monte Carlo estimate over
multiple completions ($a_i$) and their rewards ($r_i$), sampled from the same initial
prompt/state ($s$).

Formally, the objective (or loss) is accumulated over a group of completions
$\{a_1, a_2, \ldots, a_G\}$ to a given prompt $s$:

$$
J(\theta) = \frac{1}{G}\sum_{i=1}^G \left(\min\left(\frac{\pi_\theta(a_i \mid s)}{\pi_{\theta_{\text{old}}}(a_i \mid s)}A_i, \text{clip}\left(\frac{\pi_\theta(a_i \mid s)}{\pi_{\theta_{\text{old}}}(a_i \mid s)}, 1-\varepsilon, 1+\varepsilon\right)A_i\right) - \beta\, \mathcal{D}_{\text{KL}}(\pi_\theta \Vert \pi_{\text{ref}})\right)
$$

## TODO

1. Talk about token level vs sequence level ([video](https://www.youtube.com/watch?v=pW34NAiXmns)).
2. Refer to the Castform GRPO website.
3. [RLHF Book: Reasoning](https://rlhfbook.com/c/07-reasoning)
4. ["The State of LLM Reasoning Model Training"](https://magazine.sebastianraschka.com/p/the-state-of-llm-reasoning-model-training), Sebastian Raschka

[^rlvr]: See the RLHF Book's [discussion of RLVR](https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr).

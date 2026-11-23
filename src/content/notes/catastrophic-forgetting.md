---
title: Catastrophic Forgetting in LLMs
description: Reading on catastrophic forgetting in SFT, RL, and on-policy distillation.
date: 2026-11-21
updated: 2026-11-22
---

**Catastrophic forgetting** occurs when a model trained sequentially on multiple domains overwrites previously learned knowledge while acquiring new knowledge. It is a common issue in supervised learning, where disjoint training datasets cause updates to push the model toward the new distribution.

## Why RL is more resistant to catastrophic forgetting than SFT

1. **RL generates its own experience.** The training data distribution depends on the policy, and the LLM samples its own outputs. When a new objective or task is introduced, the LLM still explores across states. Old behaviors keep getting sampled as long as they remain useful or high-reward. In SFT, samples from the previous domain disappear unless they are explicitly replayed.
2. **RL optimizes expected cumulative reward, not exact targets.** The updates focus on improving long-term outcomes rather than fitting a new token-level distribution for each input. Old knowledge that remains relevant to the reward naturally persists. When new tasks share structure with old ones, updates tend to generalize rather than overwrite.
3. **Reward structures across domains overlap substantially.** Forgetting can still occur when the reward of a new domain sharply conflicts with that of a previous one, for example optimizing for concise responses versus detailed, step-by-step reasoning. The risk is higher when prompts from different domains are semantically similar. However, RLHF and RLVR rewards overlap across domains such as math, code, reasoning, and instruction following, since they all aim to make outputs better, more accurate, and more aligned with human preferences or verification signals. For instance, reducing verbosity or hallucination generally benefits all domains.

## Reading

- [RL’s Razor: Why Online Reinforcement Learning Forgets Less](https://arxiv.org/html/2509.04259v1)
- [SFT, RL, and On-Policy Distillation Through a Distributional Lens](https://nrehiew.github.io/blog/sft_rl_opd/)

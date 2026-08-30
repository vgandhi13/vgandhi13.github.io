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
   from Verifiable Rewards).

## Reinforcement Learning from Human Feedback (RLHF)

TODO: will update this section later.

## Reinforcement Learning from Verifiable Rewards (RLVR)

TODO: will update this section later.

## TODO

1. Talk about token level vs sequence level ([video](https://www.youtube.com/watch?v=pW34NAiXmns)).
2. Refer to the Castform GRPO website.
3. [RLHF Book: Reasoning](https://rlhfbook.com/c/07-reasoning)
4. ["The State of LLM Reasoning Model Training"](https://magazine.sebastianraschka.com/p/the-state-of-llm-reasoning-model-training), Sebastian Raschka

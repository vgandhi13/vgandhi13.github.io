---
title: LLM Post-training
description: Reading on LLM post-training, including Cascade RL and Mix-RL.
date: 2026-11-22
updated: 2026-11-22
bibliography:
  - id: deepseek-r1
    authors: Daya Guo et al.
    title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"
    source: arXiv preprint arXiv:2501.12948
    year: 2025
    url: https://arxiv.org/abs/2501.12948
  - id: qwen3
    authors: An Yang et al.
    title: Qwen3 Technical Report
    source: arXiv preprint arXiv:2505.09388
    year: 2025
    url: https://arxiv.org/abs/2505.09388
  - id: nemotron-cascade
    authors: Boxin Wang et al.
    title: "Nemotron-Cascade: Scaling Cascaded Reinforcement Learning for General-Purpose Reasoning Models"
    source: arXiv preprint arXiv:2512.13607
    year: 2025
    url: https://arxiv.org/abs/2512.13607
---

## Qwen3 (Mixed Multi-Domain Reinforcement Learning)

**Mixed-domain RL (Mix-RL)** blends prompts from different reasoning domains into one training set and trains on them jointly. DeepSeek-R1 (Guo et al., 2025) [[1]](#ref-deepseek-r1) and Qwen3 (Yang et al., 2025) [[2]](#ref-qwen3) use this approach.

## Nemotron-Cascade (Cascade RL)

The Nemotron-Cascade paper proposes a post-training recipe called **cascaded reinforcement learning (Cascade RL)**, which trains models sequentially across domains, finishing one domain's RL stage before moving to the next [[3]](#ref-nemotron-cascade). This differs from mixed-domain RL (Mix-RL), used in DeepSeek-R1 (Guo et al., 2025) [[1]](#ref-deepseek-r1) and Qwen3 (Yang et al., 2025) [[2]](#ref-qwen3), which blend prompts from different reasoning domains for joint RL training.[^mix-vs-cascade]

<figure>
  <img src="/images/notes/cascade-rl-training-pipeline.png" alt="Cascade RL pipeline: Base Model, Multi-Stage SFT, RLHF, Instruction-Following RL, Math RL, Code RL, SWE RL, and Nemotron-Cascade." />
  <figcaption>Figure 2: Cascade RL applies sequential, domain-wise reinforcement learning after SFT, leading to substantial improvements across the corresponding domains. Source: <a href="https://arxiv.org/pdf/2512.13607#page=5">Wang et al., 2025</a>.</figcaption>
</figure>

They scale Cascade RL across human-feedback alignment, strict instruction following, mathematical reasoning, competitive programming, and software engineering.

The authors say Cascade RL for LLMs is resistant to [catastrophic forgetting](/notes/catastrophic-forgetting/) for two reasons. First, they minimize prompt overlap as much as possible across domains and stages, which reduces cross-domain interference. Second, they order the domains so that more general ones (RLHF, instruction following) come before more specialized ones (math, code, SWE). This keeps generic behaviors from overwriting specialized capabilities. The authors report that later domain-specific RL stages rarely reduce benchmark performance in earlier domains and can even improve it.

The first stage of the pipeline is SFT, which equips the model with foundational skills and capabilities that Cascade RL then enhances in later stages. The SFT curriculum has two stages. Stage 1 uses general-domain data plus math, science, and code reasoning data, with a maximum sequence length of 16k tokens. Stage 2 further strengthens reasoning with longer responses of up to 32k tokens, and adds tool use and software engineering skills.

Cascade RL then starts with general-domain RLHF on the SFT model, followed by domain-wise RLVR (using GRPO). The authors apply RLHF first because they find it substantially improves response quality by reducing verbosity and repetition, which in turn improves reasoning performance. They also keep the SFT and RL datasets strictly disjoint in prompts, so the model cannot rely on answers memorized from SFT during RL training.

## Reading

- [Qwen3 Technical Report (2025)](https://arxiv.org/abs/2505.09388)
- [Nathan Lambert: Cornell post-training talk (slide 41)](https://natolambert.com/slides/2026/cornell-post-training/talk#41)
- [Stripe: Fine-tuning LLMs for risk assessment](https://stripe.dev/blog/training-llms-for-risk-assessment)
- [LinkedIn post](https://lnkd.in/p/es8KZyNW)
- [Sergio Paniego: Train the Agent (slides)](https://huggingface.co/spaces/sergiopaniego/train-the-agent-slides)
- [Bespoke Labs: Teaching NVIDIA’s Nemotron 3.5 Super-VL ML Engineering](https://bespokelabs.ai/blog/teaching-nvidias-nemotron-ml-engineering)
- [Perplexity](https://www.perplexity.ai/hub/blog/learning-from-real-world-experience)
- [MiMo technical report (PDF)](https://arxiv.org/pdf/2505.07608)
- [Aleksa Gordić: model announcement (LinkedIn)](https://www.linkedin.com/posts/aleksagordic_very-excited-to-announce-our-new-models-share-7516517658532417537-E0Ts/)

[^mix-vs-cascade]: **Mix-RL: domains alternate throughout training.**

    ```text
    Batch 1: Math, Math, Math, Math
    Batch 2: Code, Code, Code, Code
    Batch 3: Logic, Logic, Logic, Logic
    Batch 4: Math, Math, Math, Math
    Batch 5: Code, Code, Code, Code
    Batch 6: Logic, Logic, Logic, Logic
    ...
    ```

    The model repeatedly revisits every domain during the same RL training run.

    **Cascade RL: complete one domain before moving to the next.**

    ```text
    Math RL stage:
      Batch 1: Math, Math, Math, Math
      Batch 2: Math, Math, Math, Math
      ...
      Batch 1000: Math, Math, Math, Math

    Code RL stage:
      Batch 1001: Code, Code, Code, Code
      Batch 1002: Code, Code, Code, Code
      ...
      Batch 2000: Code, Code, Code, Code

    Logic RL stage:
      Batch 2001: Logic, Logic, Logic, Logic
      ...
    ```

    Once the math RL stage finishes, the model moves to coding RL. It does not routinely return to math training batches during the coding stage.

    So the distinction is interleaving domains versus completing domain-specific training stages sequentially, not whether an individual batch contains mixed prompts.

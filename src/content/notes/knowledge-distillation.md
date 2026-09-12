---
title: Knowledge Distillation, On Policy Distillation, On Policy Self Distillation
description: A reading list in progress on knowledge distillation, on-policy distillation, and on-policy self-distillation.
date: 2026-08-29
updated: 2026-09-12
wip: true
bibliography:
  - id: gou2021
    authors: Jianping Gou, Baosheng Yu, Stephen J. Maybank, and Dacheng Tao
    title: "Knowledge Distillation: A Survey"
    source: International Journal of Computer Vision
    details: "vol. 129, pp. 1789–1819"
    year: 2021
    url: https://arxiv.org/abs/2006.05525
  - id: hopsworks-temperature
    authors: Hopsworks
    title: LLM Temperature
    source: MLOps Dictionary
    year: 2026
    url: https://www.hopsworks.ai/dictionary/llm-temperature
  - id: hinton2015
    authors: Geoffrey Hinton, Oriol Vinyals, and Jeff Dean
    title: Distilling the Knowledge in a Neural Network
    source: "arXiv preprint arXiv:1503.02531"
    year: 2015
    url: https://arxiv.org/abs/1503.02531
  - id: kim2016
    authors: Yoon Kim and Alexander M. Rush
    title: Sequence-Level Knowledge Distillation
    source: Proceedings of the 2016 Conference on Empirical Methods in Natural Language Processing
    details: "pp. 1317–1327"
    year: 2016
    url: https://aclanthology.org/D16-1139/
---

TODO: this note is a placeholder while I work through the material below and write it up
properly.

## Knowledge Distillation

Knowledge distillation transfers knowledge from a large model, called the **teacher**, to a smaller model, called the **student**. It allows a smaller, faster model to inherit much of the teacher's capability without having to learn solely from the original hard labels, making powerful models cheaper and easier to deploy.[[1]](#ref-gou2021)

Instead of training the student only on correct answers, we train it on the teacher's full probability distribution over possible outputs. This tells the student not only which answer the teacher prefers, but also how confident the teacher is about each alternative.

<figure class="narrow">
  <img src="/images/notes/knowledge-distillation-teacher-student.jpg" alt="A large teacher model transfers knowledge learned from shared data to a smaller student model." />
  <figcaption>Teacher-to-student knowledge transfer. Image credit: Gou et al., <a href="#ref-gou2021">“Knowledge Distillation: A Survey” [1]</a>.</figcaption>
</figure>

Softmax is a mathematical function that **converts raw scores, called logits, into probabilities**. It helps a model express its relative confidence that an input belongs to each category, or class, while ensuring that the output values sum to 1.[^softmax-example]

[^softmax-example]: Suppose a model assigns the logits $[2, 1, 0]$ to the classes cat, dog, and bird. Softmax exponentiates each logit and divides it by the sum of all three exponentiated logits:

    | Class | Logit $z_i$ | Softmax probability $p_i$ |
    | --- | ---: | ---: |
    | Cat | $2$ | $\frac{e^2}{e^2 + e^1 + e^0} = 0.665$ |
    | Dog | $1$ | $\frac{e^1}{e^2 + e^1 + e^0} = 0.245$ |
    | Bird | $0$ | $\frac{e^0}{e^2 + e^1 + e^0} = 0.090$ |

    The probabilities sum to $0.665 + 0.245 + 0.090 = 1.000$, and cat receives the highest probability.

A temperature parameter $T$ can be added to softmax to control how sharp or flat its probability distribution is. At $T=1$, it behaves as ordinary softmax. Lower temperatures ($T<1$) sharpen the distribution, making high-logit options more dominant; higher temperatures ($T>1$) flatten it, spreading probability mass across more options.[[2]](#ref-hopsworks-temperature)

In knowledge distillation, the one-hot ground-truth labels are **hard targets**, while the teacher's probability distribution, often softened with $T>1$, provides **soft targets**. The softer distribution reveals which alternatives the teacher considers similar or plausible, giving the student more information than the correct label alone.[[1]](#ref-gou2021)

<figure class="narrow">
  <img src="/images/notes/softmax-temperature-distributions.png" alt="Five bar charts show the probability of the words onions, pants, shoes, and apples completing the sentence I like red at temperatures 0.2, 0.7, 1, 1.5, and 50. The distribution changes from almost entirely apples at low temperature to nearly uniform at high temperature." />
  <figcaption>Increasing temperature flattens the distribution over candidate words. Source: <a href="#ref-hopsworks-temperature">Hopsworks, “LLM Temperature” [2]</a>.</figcaption>
</figure>

### Training with soft targets

Soft targets are commonly used for distillation training. A typical procedure has three steps:

1. Train the teacher model on the original task and dataset.
2. Run the training examples through the teacher to produce logits. Convert these logits into soft targets using softmax with a higher temperature, which makes the probability distribution softer.
3. Train the student on the soft targets, often alongside the hard targets (the ground-truth labels). The objective combines a distillation loss that measures the difference between the student's and teacher's output distributions with a standard supervised loss on the hard targets.

<figure>
  <img src="/images/notes/knowledge-distillation-training-pipeline.png" alt="A pretrained teacher and a student process a transfer dataset. Temperature-scaled softmax produces soft targets for both models, a distillation loss compares them, and a separate student loss compares the student's ordinary softmax output with the ground-truth label." />
  <figcaption>The benchmark knowledge-distillation training pipeline combines a distillation loss on softened outputs with a supervised loss on ground-truth labels. Source: Gou et al., <a href="#ref-gou2021">“Knowledge Distillation: A Survey” [1]</a>, Figure 5.</figcaption>
</figure>

Through this process, the student learns not only which answer is correct, but also the teacher's relative confidence across alternatives. Probability assigned to incorrect categories can encode similarities that hard labels discard, giving the student a richer training signal and helping it imitate the teacher's behavior. By optimizing a weighted combination of the supervised and distillation losses, a student can approach the teacher's accuracy despite having far fewer parameters.[[1]](#ref-gou2021)

### Distillation loss

The loss proposed by Hinton, Vinyals, and Dean is a weighted combination of two cross-entropy objectives: one makes the student imitate the teacher, and the other makes it predict the true label.[[3]](#ref-hinton2015)

Let $v_i$ be the teacher's logit and $z_i$ the student's logit for class $i$. At temperature $T$, their probability distributions are

$$
p_i^{(T)} = \frac{e^{v_i/T}}{\sum_j e^{v_j/T}},
\qquad
q_i^{(T)} = \frac{e^{z_i/T}}{\sum_j e^{z_j/T}}.
$$

The **distillation loss** is the cross-entropy between the teacher's and student's softened distributions:

$$
\mathcal{L}_{\text{soft}}
= -\sum_i p_i^{(T)} \log q_i^{(T)}.
$$

Because the teacher distribution is fixed, this cross-entropy objective can equivalently be viewed as minimizing $D_{\mathrm{KL}}\!\left(p^{(T)} \parallel q^{(T)}\right)$.[^cross-entropy-kl] The **hard-target loss** is ordinary cross-entropy between the one-hot true label $y$ and the student's temperature-$1$ distribution:

$$
\mathcal{L}_{\text{hard}}
= -\sum_i y_i \log q_i^{(1)}.
$$

Using $\alpha$ and $\beta$ for the two loss weights, the complete objective can be written as[^distillation-loss-example]

$$
\mathcal{L}
= \alpha T^2 \mathcal{L}_{\text{soft}}
+ \beta \mathcal{L}_{\text{hard}}.
$$

Both terms use the same student logits. The soft term evaluates them at the same high temperature used by the teacher, while the hard term evaluates them at $T=1$. The paper does not prescribe universal values for $\alpha$ and $\beta$, although it reports generally placing considerably less weight on the hard-target term. In its speech-recognition experiments, it used a relative hard-target cross-entropy weight of $0.5$.[[3]](#ref-hinton2015) Here, the $T^2$ factor is present because, when the soft- and hard-target losses are combined, increasing $T$ would otherwise make the soft-target gradient weaker relative to the hard-target gradient.[[3]](#ref-hinton2015)

### Knowledge Distillation for Language Models

#### Token-level distillation

Knowledge distillation is not limited to language modeling. In a multiclass classification problem, it usually matches one output distribution for each input. An autoregressive language model instead predicts a distribution at every sequence position, so the distillation objective can be decomposed into a sum of per-token distribution-matching losses.

Let $s$ be the source sentence or prompt, $u=(u_1,\ldots,u_J)$ a complete output sequence produced by the teacher, and $\mathcal{V}$ the model's tokenizer vocabulary. Continuing the notation above, let $p$ be the teacher's next-token distribution and $q$ the student's next-token distribution. The prefix $u_{<j}=(u_1,\ldots,u_{j-1})$ contains the tokens preceding position $j$.

Kim and Rush originally formulated this objective as word-level distillation for neural machine translation. Because their setup used a word vocabulary, the same expression is better read for modern language models as per-token distribution matching over the tokenizer vocabulary:[[4]](#ref-kim2016)

$$
\mathcal{L}_{\text{token-KD}}
= -\sum_{j=1}^{J}\sum_{k=1}^{|\mathcal{V}|}
p\!\left(u_j=k \mid s,u_{<j}\right)
\log q\!\left(u_j=k \mid s,u_{<j}\right).
$$

In this offline formulation, the loss is generally computed over a static text sequence already included in the training corpus. It has the ordinary cross-entropy form. At each position $j$, the teacher distribution $p(\cdot \mid s,u_{<j})$ assigns probability to every possible next token $k\in\mathcal{V}$, and the student is penalized when its distribution $q(\cdot \mid s,u_{<j})$ puts too little probability on tokens the teacher considers likely. The inner sum aggregates this mismatch across the vocabulary, while the outer sum adds the loss across the complete sequence.[^token-kd-example]

#### Sequence-level distillation

Sequence-level distillation instead treats $\mathcal{U}$ as the space of all possible output sequences and asks the student to match the teacher's distribution over complete sequences. The exact objective requires summing over every $u\in\mathcal{U}$, an exponentially large space. Kim and Rush make this tractable by approximating the teacher distribution with a point mass on one high-probability teacher output $\hat{u}$ found using beam search:[[4]](#ref-kim2016)

$$
\hat{u}
= \operatorname{BeamSearch}_{p}(s)
\approx \arg\max_{u\in\mathcal{U}} p(u\mid s).
$$

Under this approximation, the sequence-level cross-entropy reduces to the negative log-probability that the student assigns to $\hat{u}$:

$$
\begin{aligned}
\mathcal{L}_{\text{seq-KD}}(s)
&= -\sum_{u\in\mathcal{U}} p(u\mid s)\log q(u\mid s) \\
&\approx -\log q(\hat{u}\mid s) \\
&= -\sum_{j=1}^{|\hat{u}|}
\log q\!\left(\hat{u}_j \mid s,\hat{u}_{<j}\right).
\end{aligned}
$$

Sequence-level KD moves toward modern distillation methods because the teacher now generates the tokens that supervise the student. However, the teacher outputs are generated *a priori*, stored, and then treated as a fixed training corpus. We will refer to this setup as **offline KD**. Replacing the intractable distribution over all possible sequences with fixed teacher generations makes training practical and sets up the later contrast with on-policy distillation, where the training sequences change as the student changes.

[^cross-entropy-kl]: The equivalence follows from decomposing cross-entropy into entropy plus KL divergence. For the teacher distribution $p^{(T)}$ and student distribution $q^{(T)}$,

    $$
    D_{\mathrm{KL}}\!\left(p^{(T)} \parallel q^{(T)}\right)
    = \sum_i p_i^{(T)} \log \frac{p_i^{(T)}}{q_i^{(T)}}.
    $$

    Expanding gives

    $$
    \begin{aligned}
    D_{\mathrm{KL}}\!\left(p^{(T)} \parallel q^{(T)}\right)
    &= \sum_i p_i^{(T)} \log p_i^{(T)}
       - \sum_i p_i^{(T)} \log q_i^{(T)} \\
    &= -H\!\left(p^{(T)}\right) + \mathcal{L}_{\text{soft}},
    \end{aligned}
    $$

    where

    $$
    \begin{aligned}
    H\!\left(p^{(T)}\right)
    &= -\sum_i p_i^{(T)} \log p_i^{(T)}, \\
    \mathcal{L}_{\text{soft}}
    &= -\sum_i p_i^{(T)} \log q_i^{(T)}.
    \end{aligned}
    $$

    Therefore,

    $$
    \boxed{\mathcal{L}_{\text{soft}}
    = H\!\left(p^{(T)}\right)
    + D_{\mathrm{KL}}\!\left(p^{(T)} \parallel q^{(T)}\right)}.
    $$

    During training, the teacher is fixed, so $p^{(T)}$ and its entropy are constant. The student can change only $q^{(T)}$. Consequently,

    $$
    \arg\min_{q^{(T)}} \mathcal{L}_{\text{soft}}
    = \arg\min_{q^{(T)}} D_{\mathrm{KL}}\!\left(p^{(T)} \parallel q^{(T)}\right).
    $$

    For a numerical example, suppose $p=(0.8,0.2)$ and $q=(0.6,0.4)$. Using natural logarithms:

    | Quantity | Calculation |
    | --- | --- |
    | Cross-entropy | $\mathcal{L}_{\text{soft}}=-[0.8\log(0.6)+0.2\log(0.4)]=0.592$ |
    | Teacher entropy | $H(p)=-[0.8\log(0.8)+0.2\log(0.2)]=0.500$ |
    | KL divergence | $D_{\mathrm{KL}}(p\parallel q)=0.8\log\frac{0.8}{0.6}+0.2\log\frac{0.2}{0.4}=0.092$ |

    The displayed values satisfy $\mathcal{L}_{\text{soft}}=H(p)+D_{\mathrm{KL}}(p\parallel q)=0.500+0.092=0.592$. If the student improves until $q=p=(0.8,0.2)$, then $D_{\mathrm{KL}}(p\parallel q)=0$ and $\mathcal{L}_{\text{soft}}=H(p)=0.500$. The minimum cross-entropy occurs when the student matches the teacher, but it does not generally become zero; the fixed teacher entropy remains.

[^distillation-loss-example]: Consider a three-class example with teacher logits $v=(\log 9,0,0)$, student logits $z=(\log 4,0,0)$, temperature $T=2$, and hard label $y=(1,0,0)$. Let $\alpha=0.8$ and $\beta=0.2$.

    | Component | Calculation | Value |
    | --- | --- | ---: |
    | Teacher soft targets | $p^{(2)}=\frac{(3,1,1)}{3+1+1}$ | $(0.6000,0.2000,0.2000)$ |
    | Student soft output | $q^{(2)}=\frac{(2,1,1)}{2+1+1}$ | $(0.5000,0.2500,0.2500)$ |
    | Student hard output | $q^{(1)}=\frac{(4,1,1)}{4+1+1}$ | $(0.6667,0.1667,0.1667)$ |
    | Soft loss | $-[0.6\log(0.5)+0.2\log(0.25)+0.2\log(0.25)]$ | $0.9704$ |
    | Hard loss | $-[1\log(0.6667)+0\log(0.1667)+0\log(0.1667)]$ | $0.4055$ |
    | Combined loss | $0.8(2^2)(0.9704)+0.2(0.4055)$ | $3.1864$ |

    The soft branch trains the student to match the teacher's complete distribution, while the hard branch rewards probability assigned to the correct first class. The factor $T^2$ rescales the soft-loss contribution; it does not alter the probabilities themselves.

[^token-kd-example]: Suppose the static distillation corpus contains the prompt “Choose two colors:” and the teacher-produced output $u=(\text{red},\text{blue})$. For a toy vocabulary $\mathcal{V}=\{\text{red},\text{blue},\text{green}\}$, consider these teacher and student distributions:

    | Position and context | Teacher $p$ over (red, blue, green) | Student $q$ over (red, blue, green) | Per-token cross-entropy |
    | --- | --- | --- | --- |
    | $j=1$: “Choose two colors:” | $(0.70,0.20,0.10)$ | $(0.60,0.25,0.15)$ | $-[0.70\log(0.60)+0.20\log(0.25)+0.10\log(0.15)]=0.825$ |
    | $j=2$: “Choose two colors: red” | $(0.10,0.80,0.10)$ | $(0.20,0.65,0.15)$ | $-[0.10\log(0.20)+0.80\log(0.65)+0.10\log(0.15)]=0.695$ |

    Using natural logarithms, the sequence loss is $\mathcal{L}_{\text{token-KD}}=0.825+0.695=1.520$. Although the teacher selected “red” and then “blue,” every vocabulary probability contributes to the loss at each position.

## To read

- [On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/), Thinking Machines
- [On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes](https://arxiv.org/pdf/2306.13649) (GKD)
- [On-Policy Self-Distillation](https://arxiv.org/pdf/2601.18734) (OPSD)

## To watch

- ["On Policy Distillation - How the big AI labs actually train their LLMs"](https://www.youtube.com/watch?v=ARRD9itTMgw)
- ["On-Policy Distillation in 20 Min"](https://www.youtube.com/watch?v=4l39C6-MZsE), Zachary Huang
- ["How On Policy Self Distillation Works"](https://www.youtube.com/watch?v=wxOZWD6wYVY&pp=ugUEEgJlbg%3D%3D), Sasha Rush
- ["Knowledge Distillation: How LLMs train each other"](https://www.youtube.com/watch?v=jrJKRYAdh7I&pp=ugUHEgVlbi1VUw%3D%3D), Julia Turc

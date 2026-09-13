---
title: Knowledge Distillation, On Policy Distillation, On Policy Self Distillation
description: A reading list in progress on knowledge distillation, on-policy distillation, and on-policy self-distillation.
date: 2026-08-29
updated: 2026-09-13
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
  - id: meta-llama4
    authors: Meta AI
    title: "The Llama 4 herd: The beginning of a new era of natively multimodal AI innovation"
    source: Meta AI Blog
    year: 2025
    url: https://ai.meta.com/blog/llama-4-multimodal-intelligence/
  - id: deepseek-r1
    authors: DeepSeek-AI et al.
    title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"
    source: "arXiv preprint arXiv:2501.12948"
    year: 2025
    url: https://arxiv.org/abs/2501.12948
  - id: google-gemma3
    authors: Google for Developers
    title: "Introducing Gemma 3: The Developer Guide"
    source: Google Developers Blog
    year: 2025
    url: https://developers.googleblog.com/introducing-gemma3/
  - id: turc-distillation
    authors: Julia Turc
    title: "Knowledge Distillation: How LLMs train each other"
    source: YouTube
    year: 2025
    url: https://www.youtube.com/watch?v=jrJKRYAdh7I
  - id: gemma3-report
    authors: Gemma Team, Google DeepMind
    title: Gemma 3 Technical Report
    source: "arXiv preprint arXiv:2503.19786"
    year: 2025
    url: https://arxiv.org/abs/2503.19786
  - id: busbridge2025
    authors: Dan Busbridge, Amitis Shidani, Floris Weers, Jason Ramapuram, Etai Littwin, and Russ Webb
    title: Distillation Scaling Laws
    source: Proceedings of the 42nd International Conference on Machine Learning
    year: 2025
    url: https://arxiv.org/abs/2502.08606
  - id: burns2023
    authors: Collin Burns et al.
    title: "Weak-to-Strong Generalization: Eliciting Strong Capabilities With Weak Supervision"
    source: "arXiv preprint arXiv:2312.09390"
    year: 2023
    url: https://arxiv.org/abs/2312.09390
  - id: hinton-dark-knowledge
    authors: Geoffrey Hinton
    title: Dark Knowledge
    source: TTIC Distinguished Lecture Series
    year: 2014
    url: https://www.ttic.edu/dls-2014-2015/
  - id: ye2025-black-box
    authors: Tianzhu Ye, Li Dong, Zewen Chi, Xun Wu, Shaohan Huang, and Furu Wei
    title: Black-Box On-Policy Distillation of Large Language Models
    source: "arXiv preprint arXiv:2511.10643"
    year: 2025
    url: https://arxiv.org/abs/2511.10643
  - id: suzuki2025-fingerprints
    authors: Teppei Suzuki, Ryokan Ri, and Sho Takase
    title: Natural Fingerprints of Large Language Models
    source: "arXiv preprint arXiv:2504.14871"
    year: 2025
    url: https://arxiv.org/abs/2504.14871
---

TODO: this note is a placeholder while I work through the material below and write it up
properly.

## Knowledge Distillation

*Adapted from ["Everything You Need to Know about Knowledge Distillation"](https://huggingface.co/blog/Kseniase/kd).*

Knowledge distillation transfers knowledge from a large model, called the **teacher**, to a smaller model, called the **student**. It allows a smaller, faster model to inherit much of the teacher's capability without having to learn solely from the original hard labels, making powerful models cheaper and easier to deploy.[[1]](#ref-gou2021)

Instead of training the student only on correct answers, we train it on the teacher's full probability distribution over possible outputs. This tells the student not only which answer the teacher prefers, but also how confident the teacher is about each alternative.

<span id="dark-knowledge"></span>

This helps because the teacher's *full probability distribution* carries far more information than a single correct answer. For an image of a dog, a teacher might output `dog: 0.9, wolf: 0.08, cat: 0.001`. The relative probabilities reveal that the teacher considers dogs more similar to wolves than to cats. Hinton called this hidden similarity structure **dark knowledge**, and it is exactly the kind of signal a small model struggles to learn from hard labels alone.[[12]](#ref-hinton-dark-knowledge)

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

### Types of knowledge distillation

There are three main ways to transfer knowledge during training: offline distillation, online distillation, and self-distillation.

<figure>
  <img src="/images/notes/distillation-training-types.jpg" alt="A table comparing offline, online, and self-distillation by teacher model, training approach, advantages, and challenges. Offline distillation uses a fixed pretrained teacher, online distillation trains teacher and student together, and self-distillation uses the model itself as the teacher." />
  <figcaption>Offline, online, and self-distillation differ in where the teacher signal comes from and when the teacher is trained. Source: <a href="https://huggingface.co/blog/Kseniase/kd">Ksenia Se and Alyona Vert, “Everything You Need to Know about Knowledge Distillation”</a>.</figcaption>
</figure>

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

Because the teacher distribution is fixed, this cross-entropy objective can equivalently be viewed as minimizing $D_{\mathrm{KL}}\!\left(p^{(T)} \parallel q^{(T)}\right)$, as shown in [Cross-Entropy and Forward KL](/notes/entropy-cross-entropy-and-kl-divergence/#cross-entropy-and-forward-kl). The **hard-target loss** is ordinary cross-entropy between the one-hot true label $y$ and the student's temperature-$1$ distribution:

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

*Adapted from ["Adapting Knowledge Distillation for LMs"](https://rlhfbook.com/c/12-synthetic-data#adapting-knowledge-distillation-for-lms).*

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

Under this approximation, the sequence-level cross-entropy reduces to the negative log-probability that the student assigns to $\hat{u}$:[^sequence-kd-example]

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

The token- and sequence-level objectives above are cross-entropies between a fixed teacher distribution and the student. As explained in [Cross-Entropy and Forward KL](/notes/entropy-cross-entropy-and-kl-divergence/#cross-entropy-and-forward-kl), minimizing either objective is therefore equivalent to minimizing forward KL from the teacher to the student.

Their fixed teacher-generated training corpora also place them on the offline side of the [sampling distinction between SFT and RL](/notes/entropy-cross-entropy-and-kl-divergence/#sft-and-rl-through-the-kl-lens). On-policy distillation will instead train on completions sampled from the current student.

### How it is being used in practice

*Adapted from [Julia Turc, "Knowledge Distillation: How LLMs train each other"](https://www.youtube.com/watch?v=jrJKRYAdh7I).*

Not all distillation claims are created equal. In the open-weight ecosystem, Google distilled its Gemini models into Gemma 2 and Gemma 3, while Meta distilled Llama 4 Behemoth into Llama 4 Scout and Maverick. DeepSeek-R1 follows a different pattern: its mixture-of-experts teacher generated reasoning data used to fine-tune dense students from other model families, namely Llama 3.1 and Qwen 2.5.

<figure class="narrow">
  <img src="/images/notes/distillation-model-families.jpg" alt="A comparison of teacher-to-student distillation, including Gemini to Gemma 2 and Gemma 3, Llama 4 Behemoth to Llama 4 Scout and Maverick, and DeepSeek-R1 to Llama 3.1 and Qwen 2.5." />
  <figcaption>Examples of how knowledge distillation is used across open-weight model families. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

Distillation can be applied at two main stages of the LLM training pipeline, or at both:

1. **Pre-training.** The model learns from an enormous corpus, much of it gathered from the web, through next-token prediction. Meta used codistillation from Llama 4 Behemoth during Llama 4 Maverick's pre-training.[[5]](#ref-meta-llama4)
2. **Post-training.** The pretrained model is fine-tuned on instruction-response pairs to align its behavior with human preferences and strengthen abilities such as reasoning. DeepSeek used this stage to train dense Llama 3.1 and Qwen 2.5 students on reasoning data generated by DeepSeek-R1.[[6]](#ref-deepseek-r1)
3. **Both stages.** Gemma 3 used distillation during pre-training and again during post-training.[[7]](#ref-google-gemma3)

<figure class="narrow">
  <img src="/images/notes/llm-distillation-training-stages.jpg" alt="A teacher and student training pipeline showing that knowledge distillation can be applied during pre-training, post-training, or both stages." />
  <figcaption>Distillation can transfer teacher knowledge during pre-training, post-training, or both. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

#### Proper distillation and behavioral cloning

However, the exact transfer mechanism differs across model families. Google and Meta use **logit-level distillation**, which the source calls **proper distillation**. A more precise name for DeepSeek-R1's approach is **behavioral cloning**: its students imitate teacher-generated sequences rather than matching the teacher's full token probability distribution.[[8]](#ref-turc-distillation)

<figure class="narrow">
  <img src="/images/notes/proper-distillation-vs-behavioral-cloning.jpg" alt="Gemini-to-Gemma and Llama 4 Behemoth-to-Scout and Maverick are grouped under proper distillation, while DeepSeek-R1-to-Llama 3.1 and Qwen 2.5 is grouped under behavioral cloning." />
  <figcaption>Logit-level distillation transfers full probability distributions, while behavioral cloning trains on teacher-generated sequences. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

In the case of proper distillation, assume the teacher is already trained and fixed while the student is being trained. One update proceeds as follows:

1. Sample a document from the training corpus and train the student to predict it one token at a time. Suppose the document is `the cat sat on the mat`, and at position 6 the target token is `mat`.
2. Feed the incomplete prefix, `the cat sat on the`, to both the teacher and the student.
3. Both models output a probability distribution over the entire vocabulary. The teacher's distribution becomes the student's **soft label**.
4. Update the student's weights to minimize the gap between its prediction and the teacher's distribution using the [soft-target distillation loss](#distillation-loss). In the combined objective described above, this can be paired with a separate hard-target loss on the one-hot corpus token, which is `mat` in this example.

<figure class="narrow">
  <video src="/images/notes/proper-distillation-soft-labels.mp4" autoplay muted playsinline controls preload="metadata" style="display: block; width: 100%; height: auto;" aria-label="Animation of proper distillation at one token position. A fixed teacher and a trainable student receive the same incomplete sentence and output distributions over the vocabulary. The student's distribution moves toward the teacher's soft-label distribution."></video>
  <figcaption>At each token position, the student learns to match the teacher's complete vocabulary distribution. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

In DeepSeek-R1's behavior-cloning-style distillation, the input prompts may be collected in advance, but the teacher generates the target completions. The student is then trained on those completions using ordinary next-token prediction.[[6]](#ref-deepseek-r1)

The crucial difference is that the labels are no longer soft. At each position, the target is one-hot: if the generated next token is `mat`, then `mat` receives 100% of the target probability mass and every other token receives 0%. The student therefore learns to imitate the teacher's realized outputs. It can copy any written reasoning trace in those outputs, but it does not receive the teacher's full probability distribution over alternative tokens or its hidden internal computation.

<figure class="narrow">
  <img src="/images/notes/behavioral-cloning-hard-labels.jpg" alt="Behavioral cloning pipeline in which a teacher generates training data, then a student predicts the next token from an incomplete sequence using a one-hot hard label that assigns all target probability to the token mat." />
  <figcaption>Behavioral cloning trains the student on the teacher's sampled tokens as hard labels rather than on its full vocabulary distribution. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

#### Why not use proper distillation everywhere?

Proper distillation gives the student a richer target than behavioral cloning, but it is not always practical for two reasons:

1. **Teacher access.** Distillation requires access to the teacher's logits, making it a white-box method. Someone outside OpenAI who wanted to distill a closed GPT model would usually receive only generated text, not its complete probability distribution, so they would be limited to behavioral cloning.
2. **Compute and storage.** For every token in the training data, the teacher must produce a distribution over the entire vocabulary. Consider a hypothetical corpus with 8 trillion tokens and a vocabulary of 128,000 tokens:

$$
8 \times 10^{12}\ \text{tokens}
\times 128 \times 10^3\ \text{values per token}
\approx 10^{18}\ \text{soft-label values}.
$$

At one byte per value in FP8, storing the dense targets alone would require roughly one exabyte. Gemma 3 reduces this burden by sampling 256 logits per token, weighted by the teacher probabilities. It sets the unsampled logits to zero probability and renormalizes the sparse target distribution.[[9]](#ref-gemma3-report) Applied to the same hypothetical 8-trillion-token corpus, this still produces about $2 \times 10^{15}$ values, but it is far smaller than retaining a full vocabulary distribution. Computing or streaming these targets as they are consumed can avoid storing a complete soft-label dataset, at the cost of running the teacher during student training.

#### Codistillation

Meta says that codistillation from Llama 4 Behemoth during pre-training amortized the expensive teacher forward passes needed to compute distillation targets for most of Llama 4 Maverick's training data.[[5]](#ref-meta-llama4) The distinction becomes clearer by separating regular distillation into two phases.

**Step 1: train the teacher.** A forward pass through the teacher produces a distribution that is compared with the hard label, and the resulting loss updates the teacher.

<figure class="narrow">
  <img src="/images/notes/regular-distillation-teacher-training.jpg" alt="Step one of regular distillation. A trainable teacher receives an incomplete sentence, produces a vocabulary distribution, compares it with the one-hot hard label for mat, and updates its weights." />
  <figcaption>Regular distillation begins by training the teacher against the hard target. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

**Step 2: train the student.** After the teacher has been trained and frozen, another forward pass through it produces the soft label used to train the student.

<figure class="narrow">
  <img src="/images/notes/regular-distillation-student-training.jpg" alt="Step two of regular distillation. A frozen teacher and a trainable student receive the same incomplete sentence, produce vocabulary distributions, and the student learns to match the teacher's output." />
  <figcaption>Student training requires a second teacher forward pass to generate the soft target. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

In the co-distillation scheme illustrated below, the teacher and student are trained at the same time. The teacher's forward pass serves two purposes: its prediction is compared with the hard target to update the teacher, and the same prediction immediately becomes a soft target for the student. The teacher therefore does not need to be rerun later over the same data solely to generate distillation targets.[[8]](#ref-turc-distillation)

The tradeoff is that the teacher is still learning, so its early soft targets may be inaccurate. Meta's loss dynamically weights soft and hard targets, allowing the hard labels to keep the student grounded while the teacher improves.[[5]](#ref-meta-llama4)

<figure class="narrow">
  <img src="/images/notes/codistillation-joint-training.jpg" alt="Codistillation pipeline in which a trainable teacher and trainable student process the same incomplete sentence simultaneously. The teacher learns from the one-hot hard label, while its current vocabulary distribution also supplies a soft target for the student." />
  <figcaption>Codistillation reuses the teacher's current forward pass to train both the teacher and student together. Source: <a href="#ref-turc-distillation">Julia Turc, “Knowledge Distillation: How LLMs train each other” [8]</a>.</figcaption>
</figure>

#### Black-box distillation

*Adapted from [Sergei Parfenov, "How Model Distillation Actually Works (and What the 'China Distilled Our Model' Headlines Really Mean)"](https://dev.to/p0rt/how-model-distillation-actually-works-and-what-the-china-distilled-our-model-headlines-really-3o0o).*

Headlines regularly claim that one AI lab distilled a model developed by another lab. Most of the methods discussed above assume access to the teacher's logits or complete output distribution. This is **white-box distillation**, and it requires access to the model's internals or full probability outputs.

A closed commercial API for a model such as Claude or GPT does not expose the raw logits or full vocabulary distribution needed for white-box distillation. It primarily exposes generated text. This forces a **black-box distillation** approach, where the student learns from the teacher's text outputs without access to its parameters or logits.[[13]](#ref-ye2025-black-box)

The standard black-box recipe is the [sequence-level distillation](#sequence-level-distillation) or behavioral-cloning setup described earlier:

1. Prompt the teacher with a large and diverse collection of inputs.
2. Collect the teacher's generated answers.
3. Build a synthetic dataset of `(prompt, teacher answer)` pairs.
4. Fine-tune the student on that dataset with supervised fine-tuning, optionally followed by preference optimization or reinforcement learning.

Because the student observes only sampled text, it loses the [dark knowledge](#dark-knowledge) contained in the teacher's soft labels. Even so, a large, high-quality synthetic dataset from a strong teacher can transfer a remarkable amount of capability.

This also explains why claims that model X learned from model Y's outputs are difficult to prove. Black-box distillation does not require copying a weights file. The observable evidence is indirect: shared stylistic quirks, self-identification mistakes, or other statistical fingerprints in behavior. Such fingerprints can reveal similarity between model outputs, but they do not by themselves establish the provenance of the training data.[[14]](#ref-suzuki2025-fingerprints)

### Distillation scaling laws

A distillation scaling law predicts student performance from three main factors:[[10]](#ref-busbridge2025)

1. **Student model size.** A larger student has more capacity to learn from the teacher.
2. **Distillation tokens.** More training tokens give the student more opportunities to learn from the teacher signal.
3. **Teacher quality.** The teacher's validation loss summarizes the effect of its size and training data on the signal supplied to the student.

These relationships follow a power law, making improvements predictable but subject to diminishing returns. The best teacher depends on the student: a small student can use a weaker teacher to save compute, while a larger student generally needs a stronger teacher signal to realize further gains.[[10]](#ref-busbridge2025)

A stronger teacher does not always produce a better student. If the gap between their learning capacities is too large, the student may struggle to imitate the teacher and can perform worse than it would with a somewhat weaker teacher. This is called the **capacity gap**.[[10]](#ref-busbridge2025)

A student can also sometimes outperform its teacher. When a stronger pretrained student learns from a weaker supervisor and then exceeds that supervisor's performance, the phenomenon is called **weak-to-strong generalization**.[[11]](#ref-burns2023)

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

[^sequence-kd-example]: Suppose the prompt is “Translate *Guten Morgen* into English.” Each complete-sequence probability is the product of the teacher's conditional token probabilities. For a coherent toy distribution:

    | Candidate sequence or probability mass | Autoregressive factorization and calculation |
    | --- | --- |
    | “Good morning.” | $p(\text{Good}\mid s)\,p(\text{morning}\mid s,\text{Good})\,p(\text{.}\mid s,\text{Good morning})=0.85\times0.86\times0.85=0.62135\approx0.62$ |
    | “Morning.” | $p(\text{Morning}\mid s)\,p(\text{.}\mid s,\text{Morning})=0.10\times0.80=0.080$ |
    | “Have a good morning.” | $p(\text{Have}\mid s)\,p(\text{a}\mid s,\text{Have})\,p(\text{good}\mid s,\text{Have a})\,p(\text{morning}\mid s,\text{Have a good})\,p(\text{.}\mid s,\text{Have a good morning})=0.04\times0.90^4=0.026244\approx0.026$ |
    | All remaining sequences combined | $1-(0.62135+0.080+0.026244)=0.272406\approx0.273$ |

    Beam search selects $\hat{u}=$ “Good morning.” Sequence-level KD replaces the teacher's full sequence distribution with a point mass on this one output. Suppose the student assigns the following conditional probabilities to its three tokens:

    | Position | Student prediction | Student probability | Token loss |
    | ---: | --- | ---: | ---: |
    | $1$ | $q(\text{Good}\mid s)$ | $0.70$ | $-\log(0.70)=0.357$ |
    | $2$ | $q(\text{morning}\mid s,\text{Good})$ | $0.80$ | $-\log(0.80)=0.223$ |
    | $3$ | $q(\text{.}\mid s,\text{Good morning})$ | $0.90$ | $-\log(0.90)=0.105$ |

    The student's probability for the complete sequence is $q(\hat{u}\mid s)=0.70\times0.80\times0.90=0.504$. Therefore, $\mathcal{L}_{\text{seq-KD}}=-\log(0.504)=0.357+0.223+0.105=0.685$. The other teacher candidates do not contribute after the point-mass approximation.

## To read

- [On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/), Thinking Machines
- [On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes](https://arxiv.org/pdf/2306.13649) (GKD)
- [On-Policy Self-Distillation](https://arxiv.org/pdf/2601.18734) (OPSD)
- [Self-Distilled RLVR](https://arxiv.org/pdf/2604.03128)

## To watch

- ["On Policy Distillation - How the big AI labs actually train their LLMs"](https://www.youtube.com/watch?v=ARRD9itTMgw)
- ["On-Policy Distillation in 20 Min"](https://www.youtube.com/watch?v=4l39C6-MZsE), Zachary Huang
- ["How On Policy Self Distillation Works"](https://www.youtube.com/watch?v=wxOZWD6wYVY&pp=ugUEEgJlbg%3D%3D), Sasha Rush
- ["Knowledge Distillation: How LLMs train each other"](https://www.youtube.com/watch?v=jrJKRYAdh7I&pp=ugUHEgVlbi1VUw%3D%3D), Julia Turc

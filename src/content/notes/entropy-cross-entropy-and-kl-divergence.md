---
title: Negative Log-Likelihood, Entropy, Cross-Entropy, and KL Divergence
description: A guide to entropy, cross-entropy, forward and reverse KL divergence, and their connection to SFT and KL-regularized RL.
date: 2026-09-12
bibliography:
  - id: chen2025
    authors: Howard Chen, Noam Razin, Karthik Narasimhan, and Danqi Chen
    title: "Retaining by Doing: The Role of On-Policy Data in Mitigating Forgetting"
    source: "arXiv preprint arXiv:2510.18874"
    year: 2025
    url: https://arxiv.org/abs/2510.18874
---

Throughout this note, let $z$ be an outcome, such as a class, token, or complete sequence, and let $p$ and $q$ be probability distributions over the same outcomes.

## Negative Log-Likelihood

Suppose an observed outcome is $z$ and a model assigns it probability $q(z)$. Its likelihood is $q(z)$, so its **negative log-likelihood (NLL)** is

$$
\mathcal{L}_{\mathrm{NLL}}(z;q)
=
-\log q(z).
$$

A likely outcome has a small NLL, while an outcome assigned near-zero probability has a very large NLL. For a dataset of $N$ observed outcomes $z_1,\ldots,z_N$, the average loss is

$$
\mathcal{L}_{\mathrm{NLL}}(q)
=
-\frac{1}{N}\sum_{n=1}^{N}\log q(z_n).
$$

When the observations are drawn from a distribution $p$, the expected NLL under $p$ is the cross-entropy $H(p,q)$ defined below.

## Entropy

In information theory, entropy ($H$) measures the average uncertainty, surprise, or information content in a distribution of messages or data. The concept was introduced by Claude Shannon.

For a distribution $p$, entropy is

$$
H(p)=-\sum_z p(z)\log p(z).
$$

For example:

- A concentrated distribution such as $(0.99,0.01)$ has low entropy.
- A flat distribution such as $(0.5,0.5)$ has high entropy.

Equivalently, entropy is the expected surprise when outcomes come from $p$ and are evaluated using $p$ itself:

$$
H(p)=\mathbb{E}_{z\sim p}\!\left[-\log p(z)\right].
$$

## Cross-Entropy

Cross-entropy measures how well a distribution $q$ predicts outcomes distributed according to a target distribution $p$:

$$
H(p,q)=-\sum_z p(z)\log q(z).
$$

This form comes from expected negative log-likelihood. For one outcome $z$, the loss under $q$ is $-\log q(z)$. Because $p$ produces that outcome with probability $p(z)$, averaging the loss over outcomes from $p$ gives

$$
\mathbb{E}_{z\sim p}\!\left[-\log q(z)\right]
=\sum_z p(z)\left[-\log q(z)\right]
=H(p,q).
$$

Here, $p(z)$ determines how much weight the target distribution gives outcome $z$, while $-\log q(z)$ measures how poorly $q$ predicts it.

## KL Divergence

KL divergence measures how one probability distribution differs from another. For discrete distributions, it is[^kl-discrete-example]

$$
D_{\mathrm{KL}}(p\parallel q)
=
\sum_z p(z)\log\frac{p(z)}{q(z)}.
$$

For continuous distributions with densities $p(z)$ and $q(z)$, the sum becomes an integral:

$$
D_{\mathrm{KL}}(p\parallel q)
=
\int p(z)\log\frac{p(z)}{q(z)}\,dz.
$$

KL divergence can also be written as an expectation. When $p$ is the target distribution and $q$ is the approximation, the direction from $p$ to $q$ is called **forward KL**:

$$
\begin{aligned}
D_{\mathrm{KL}}(p\parallel q)
&=
\mathbb{E}_{z\sim p}
\!\left[\log\frac{p(z)}{q(z)}\right] \\
&=
\mathbb{E}_{z\sim p}
\!\left[\log p(z)-\log q(z)\right].
\end{aligned}
$$

Swapping the arguments gives the **reverse KL**:

$$
\begin{aligned}
D_{\mathrm{KL}}(q\parallel p)
&=
\mathbb{E}_{z\sim q}
\!\left[\log\frac{q(z)}{p(z)}\right] \\
&=
\mathbb{E}_{z\sim q}
\!\left[\log q(z)-\log p(z)\right].
\end{aligned}
$$

The direction changes the distribution used to weight the expectation: forward KL samples from $p$, while reverse KL samples from $q$. KL divergence is not symmetric, so the order of the arguments matters:

$$
D_{\mathrm{KL}}(p\parallel q)
\neq
D_{\mathrm{KL}}(q\parallel p).
$$

By Gibbs' inequality, both directions are nonnegative. The individual log-ratio terms inside the expectation can still be negative.[^kl-negative-terms]

## Cross-Entropy and Forward KL

Cross-entropy decomposes into the entropy of the target distribution and the forward KL divergence:

$$
\begin{aligned}
H(p,q)
&=H(p)+D_{\mathrm{KL}}(p\parallel q) \\
&=-\sum_z p(z)\log p(z)
+\sum_z p(z)\log\frac{p(z)}{q(z)}.
\end{aligned}
$$

When $p$ is fixed, $H(p)$ is constant. A learned distribution $q$ can therefore minimize cross-entropy only by minimizing forward KL:

$$
\arg\min_q H(p,q)
=
\arg\min_q D_{\mathrm{KL}}(p\parallel q).
$$

Both objectives consequently have the same optimum.[^cross-entropy-kl] This is why a cross-entropy objective against a fixed teacher or data distribution can be interpreted as forward-KL minimization.

## SFT and RL Through the KL Lens

The same KL perspective clarifies an important difference between supervised fine-tuning (SFT) and KL-regularized reinforcement learning. For a fixed prompt $s$, let $u$ denote a complete output sequence. To keep the equations uncluttered, all distributions below are implicitly conditioned on $s$.

The key distinction is the distribution from which completions are sampled. SFT averages its loss over a fixed dataset distribution, so its training signal is **offline**. RL averages reward over completions sampled from the current model, so its training signal is **online**, or **on-policy**.

### SFT as Forward KL

Let $p_{\mathrm{data}}$ be the distribution represented by the SFT dataset and $q_\theta$ the model being trained. The SFT negative log-likelihood is

$$
\begin{aligned}
\mathcal{L}_{\mathrm{SFT}}(\theta)
&= \mathbb{E}_{u\sim p_{\mathrm{data}}}
\!\left[-\log q_\theta(u)\right] \\
&= H(p_{\mathrm{data}},q_\theta) \\
&= H(p_{\mathrm{data}})
+ D_{\mathrm{KL}}(p_{\mathrm{data}}\parallel q_\theta).
\end{aligned}
$$

Because $H(p_{\mathrm{data}})$ does not depend on the model parameters, minimizing the SFT loss is equivalent to minimizing the forward KL divergence:

$$
\arg\min_\theta \mathcal{L}_{\mathrm{SFT}}(\theta)
=
\arg\min_\theta
D_{\mathrm{KL}}(p_{\mathrm{data}}\parallel q_\theta).
$$

The data distribution appears first in the KL and therefore supplies the samples in the expectation.

### KL-Regularized RL as Reverse KL

For KL-regularized RL, let $q_\theta$ be the current policy, $q_{\mathrm{ref}}$ a fixed reference policy, $r(u)$ the reward, and $\beta>0$ the strength of the KL penalty. The idealized objective is

$$
J_{\mathrm{RL}}(\theta)
=
\mathbb{E}_{u\sim q_\theta}[r(u)]
-
\beta D_{\mathrm{KL}}(q_\theta\parallel q_{\mathrm{ref}}).
$$

Define the reward-induced target distribution

$$
p_R^*(u)
=
\frac{1}{Z}\,
q_{\mathrm{ref}}(u)
\exp\!\left(\frac{r(u)}{\beta}\right),
\qquad
Z
=
\sum_{u\in\mathcal{U}}
q_{\mathrm{ref}}(u)
\exp\!\left(\frac{r(u)}{\beta}\right).
$$

This target reweights the reference policy toward higher-reward completions. Substituting its log-probability into the reverse KL gives

$$
\begin{aligned}
D_{\mathrm{KL}}(q_\theta\parallel p_R^*)
&=
D_{\mathrm{KL}}(q_\theta\parallel q_{\mathrm{ref}})
-
\frac{1}{\beta}
\mathbb{E}_{u\sim q_\theta}[r(u)]
+
\log Z \\
&=
-\frac{1}{\beta}J_{\mathrm{RL}}(\theta)+\log Z.
\end{aligned}
$$

Because $Z$ does not depend on $\theta$, maximizing this KL-regularized RL objective is equivalent to minimizing $D_{\mathrm{KL}}(q_\theta\parallel p_R^*)$. This is a **reverse KL** because the learned policy appears first and the fixed reward-induced target appears second.

The explicit term $D_{\mathrm{KL}}(q_\theta\parallel q_{\mathrm{ref}})$ inside $J_{\mathrm{RL}}$ is the regularizer that keeps the policy near the reference. The reverse-KL interpretation comes from rewriting the complete reward-plus-regularization objective.

### Mode Covering Versus Mode Seeking

These two KL directions help explain the different tendencies of SFT and RL:

- **SFT is mode-covering.** Forward KL averages over $u\sim p_{\mathrm{data}}$. If the data assigns positive probability to a completion while the model assigns it near-zero probability, its contribution $-p_{\mathrm{data}}(u)\log q_\theta(u)$ grows without bound. The model is therefore encouraged to assign probability across all modes represented in the data.
- **KL-regularized RL is mode-seeking.** Reverse KL averages over $u\sim q_\theta$. Completions to which the current policy assigns very little probability are rarely sampled and receive little direct weight. The policy can therefore concentrate on a subset of high-reward modes instead of covering every mode of $p_R^*$.

<figure class="narrow">
  <img src="/images/notes/forward-reverse-kl-forgetting-dynamics.jpg" alt="A toy mixture model compares forgetting under forward-KL supervised fine-tuning and reverse-KL reinforcement learning. Forward KL stretches the new mode and draws probability mass away from the old mode, while reverse KL shifts the new mode toward the target with little change to the old mode." />
  <figcaption>A toy mixture model of forgetting dynamics: forward-KL SFT moves probability mass from the old mode to cover the target, while reverse-KL RL shifts the new mode toward the target and largely preserves the old mode. Source: Chen et al., <a href="#ref-chen2025">“Retaining by Doing: The Role of On-Policy Data in Mitigating Forgetting” [1]</a>, Figure 1.</figcaption>
</figure>

Mode covering and mode seeking describe tendencies, not guarantees. The practical behavior also depends on model capacity, optimization, reward quality, sampling, and the strength $\beta$ of the reference-policy constraint.

[^kl-discrete-example]: Take two distributions over three outcomes:

    | $z$ | $p(z)$ | $q(z)$ | $\frac{p(z)}{q(z)}$ | $\log \frac{p(z)}{q(z)}$ | $p(z)\log \frac{p(z)}{q(z)}$ |
    | --- | --- | --- | --- | --- | --- |
    | A | 0.50 | 0.25 | $2.0$ | $0.693$ | $0.3465$ |
    | B | 0.30 | 0.25 | $1.2$ | $0.182$ | $0.0546$ |
    | C | 0.20 | 0.50 | $0.4$ | $-0.916$ | $-0.1832$ |

    Summing the final column gives

    $$
    D_{\mathrm{KL}}(p\parallel q)
    =0.3465+0.0546-0.1832
    =0.2179\approx0.218.
    $$

[^kl-negative-terms]: For outcome C in the [worked example](#user-content-fn-kl-discrete-example), $\log\frac{p(\mathrm{C})}{q(\mathrm{C})}=-0.916$. This is one term inside the weighted sum, not the complete KL divergence. Other terms compensate for it, and the total KL remains nonnegative.

[^cross-entropy-kl]: For a numerical check, suppose $p=(0.8,0.2)$ and $q=(0.6,0.4)$. Using natural logarithms:

    | Quantity | Calculation |
    | --- | --- |
    | Cross-entropy | $H(p,q)=-[0.8\log(0.6)+0.2\log(0.4)]=0.592$ |
    | Target entropy | $H(p)=-[0.8\log(0.8)+0.2\log(0.2)]=0.500$ |
    | KL divergence | $D_{\mathrm{KL}}(p\parallel q)=0.8\log\frac{0.8}{0.6}+0.2\log\frac{0.2}{0.4}=0.092$ |

    The displayed values satisfy $H(p,q)=H(p)+D_{\mathrm{KL}}(p\parallel q)=0.500+0.092=0.592$. If $q$ improves until $q=p=(0.8,0.2)$, then $D_{\mathrm{KL}}(p\parallel q)=0$ and $H(p,q)=H(p)=0.500$. The minimum cross-entropy occurs when $q$ matches $p$, but it does not generally become zero because the fixed target entropy remains.

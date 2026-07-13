---
title: Pretraining
description: "How language models learn next-token prediction: the chain rule, why we optimize log-likelihood instead of raw probability, and the resulting cross-entropy loss."
date: 2026-07-11
---

Pretraining teaches the model what the world and language look like.

Suppose the training text is "The capital of France is Paris." This gets preprocessed into training examples:

1. Input: "The" → Target: "capital"
2. Input: "The capital" → Target: "of"
3. Input: "The capital of" → Target: "France"

The loss is

$$
L = -\sum_t \log p_\theta(x_t \mid x_{<t})
$$

To see where this comes from, suppose the training text is "The cat sat." The model sees:

```text
"The"     → predict "cat"
"The cat" → predict "sat"
```

At each position, the model outputs a probability distribution over all possible next tokens. For example:

| Context | True next token | Model probability |
|---|---|---|
| "The" | cat | 0.9 |
| "The cat" | sat | 0.8 |

The probability the model assigns to the entire sequence is

$$
p_\theta(x_1, x_2, \dots, x_T) = \prod_{t=1}^T p_\theta(x_t \mid x_{<t})
$$

Using the chain rule,

$$
p(\text{"The cat sat"}) = p(\text{cat} \mid \text{The}) \times p(\text{sat} \mid \text{The cat}) = 0.9 \times 0.8 = 0.72
$$

Pretraining tries to make the training text as probable as possible: maximize $p_\theta(\text{training data})$.

## Why we take logs

Since the probability of an entire sequence is a product,

$$
p = p(x_1)\, p(x_2 \mid x_1)\, p(x_3 \mid x_1, x_2) \cdots
$$

this is inconvenient: derivatives are messy, and probabilities become tiny very quickly. Instead we take the logarithm. Since $\log(ab) = \log a + \log b$,

$$
\log p(\text{sequence}) = \sum_t \log p(x_t \mid x_{<t})
$$

and we optimize a sum instead of a product. This helps for two reasons:

- **Numerical stability**: products of many probabilities quickly underflow to zero in floating-point arithmetic, while sums of logs remain well-behaved.
- **Optimization**: gradients of the log likelihood are much cleaner.

Taking the log doesn't change the objective, because the logarithm is monotonically increasing: if $a > b$ then $\log a > \log b$, so the sequence with the highest probability also has the highest log probability.

## From log-likelihood to loss

Maximizing $f$ is mathematically identical to minimizing $-f$, and frameworks like PyTorch, TensorFlow, and JAX expect you to provide a scalar loss and then compute its gradient to minimize it. So instead of "maximize log likelihood" we say "minimize negative log likelihood"; they are the same optimization problem. So instead of

$$
\max_\theta \sum_t \log p_\theta(x_t \mid x_{<t})
$$

we define

$$
L = -\sum_t \log p_\theta(x_t \mid x_{<t})
$$

Suppose the true next token is "cat":

- **Good prediction**: the model says cat: 0.99. Loss contribution: $-\log(0.99) \approx 0.01$, a tiny penalty.
- **Decent prediction**: the model says cat: 0.6. Loss: $-\log(0.6) \approx 0.51$, a bigger penalty.

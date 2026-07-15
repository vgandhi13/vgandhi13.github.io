---
title: Actor-Critic Methods
description: "How actor-critic methods combine a learned policy with a learned value function: the V, Q, and advantage functions, and where they fit into policy gradients."
date: 2026-07-14
updated: 2026-07-14
---

Actor-critic methods build on [policy gradients](/notes/policy-gradients/): alongside the policy (the "actor"), they learn a value function (the "critic") to judge how good the actor's actions are, giving a lower-variance learning signal than the raw Monte Carlo returns used in vanilla policy gradient.

## Preliminaries

- **value function** $V^\pi(s)$: the future expected reward starting at state $s$ and following policy $\pi$ from there
- **Q-function** $Q^\pi(s, a)$: the future expected reward starting at state $s$, taking action $a$, then following policy $\pi$ from there

<figure>
  <img src="/images/notes/v-q-function-comparison.jpg" alt="Side by side: left, running policy π from state s produces several trajectories, their expected sum of rewards labeled V^π(s). Right, taking action a from state s (highlighted), then running policy π, produces several trajectories, their expected sum of rewards labeled Q^π(s,a)." />
  <figcaption>Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
</figure>

$V$ and $Q$ are related: since $V^\pi(s)$ is the expected future reward under $\pi$'s own behavior at $s$, it must equal $Q^\pi(s, a)$ averaged over the actions $\pi$ would actually choose at $s$,

$$
V^\pi(s) = \mathbb{E}_{a \sim \pi(\cdot \mid s)} \left[ Q^\pi(s, a) \right]
$$

$Q^\pi(s, a)$ answers "how good is action $a$," while $V^\pi(s)$ answers "how good is state $s$, on average, under $\pi$'s own choices." Averaging the first over $\pi$'s action distribution gives the second back.

This gives a natural way to measure how good a specific action is *relative to* the policy's own average behavior: the **advantage function**,

$$
A^\pi(s, a) = Q^\pi(s, a) - V^\pi(s)
$$

how much better (or worse) it is to take action $a$ than to follow $\pi$'s own behavior at state $s$.

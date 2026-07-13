---
title: Policy Gradients
description: "RL and MDP preliminaries: states, actions, trajectories, and the expected-reward objective."
date: 2026-07-12
updated: 2026-07-13
---

Policy gradient methods are a class of reinforcement learning algorithms and a sub-class of policy optimization methods. Unlike value-based methods, which learn a value function to derive a policy, policy optimization methods directly learn a policy function $\pi$ that selects actions without consulting a value function. For policy gradient to apply, the policy function $\pi_\theta$ is parameterized by a differentiable parameter $\theta$.[^wiki]

## Preliminaries: RL and MDPs

Reinforcement learning is about an agent interacting with an environment: at each time step the agent observes the state of the world, takes an action, and the environment responds with a reward and the next state.

<figure>
  <img src="/images/notes/rl-agent-environment.jpg" alt="The agent–environment loop: the agent receives state S_t and reward R_t, takes action A_t, and the environment returns the next reward R_{t+1} and next state S_{t+1}." />
  <figcaption>The agent–environment loop. Source: <a href="https://www.ibm.com/think/topics/reinforcement-learning">IBM</a>.</figcaption>
</figure>

The formalism behind this loop is the Markov decision process (MDP): a mathematical model for sequential decision making when outcomes are uncertain. It can be formulated as

$$
\mathcal{M} = (\mathcal{S}, \mathcal{A}, P, r)
$$

a state space $\mathcal{S}$, an action space $\mathcal{A}$, transition probabilities $P(s_{t+1} | s_t, a_t)$, and a reward function $r(s, a)$. The basic objects:

- **state** $s$: the state of the "world" at time $t$
- **action** $a$: the decision taken at time $t$
- **trajectory** $\tau = (s_1, a_1, s_2, a_2, \dots, s_T, a_T)$: sequence of states/observations and actions
- **reward function** $r(s, a)$: how good is $(s, a)$?
- **policy** $\pi(a|s)$ (or $\pi(a|o)$ from observations): the behavior, usually what we are trying to learn

For a trajectory $\tau$, the **return** is the sum of rewards collected along it:

$$
r(\tau) = \sum_{t=1}^{T} r(s_t, a_t)
$$

We want policies that generate high-return trajectories.

RL methods split by where their training data comes from:

- **offline**: using only an existing dataset, no new data from the learned policy
- **online**: using new data from the learned policy

## Online RL

Online RL is a loop: run the current policy to collect a batch of data, improve the policy using that batch, and repeat. Over iterations, the policy's trajectories concentrate on the behaviors that earn reward.

<figure>
  <img src="/images/notes/online-rl-loop.png" alt="The online RL loop: run the policy to collect a batch of data, improve the policy using that batch, alongside trajectory distributions at iterations 1, 50, and 100 tightening toward successful outcomes." />
  <figcaption>The online RL loop; trajectories concentrate on rewarded behavior over iterations. Source: <a href="https://cs224r.stanford.edu/">Stanford CS224R</a>.</figcaption>
</figure>

## Policy Gradient objective

**Goal:** learn a policy $\pi_\theta$ that maximizes the expected sum of rewards over all possible episodes that this policy could produce:

$$
\theta^* = \arg\max_\theta \; \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \sum_{t=1}^{T} r(s_t, a_t) \right]
$$

where the trajectory distribution factorizes as

<span id="trajectory-factorization"></span>

$$
p_\theta(s_1, a_1, \dots, s_T, a_T) = p(s_1) \prod_{t=1}^{T} \pi_\theta(a_t | s_t) \, p(s_{t+1} | s_t, a_t)
$$

This factorization is the Markov property: the next state depends only on the current state and action, not on the rest of the history.

The expectation inside the objective is usually named $J(\theta)$, the objective function:

$$
J(\theta) = \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \sum_{t} r(s_t, a_t) \right]
$$

$J(\theta)$ tells us how good the policy is: a higher $J(\theta)$ means a better policy, and $\theta^* = \arg\max_\theta J(\theta)$.

Computing $\mathbb{E}_{\tau \sim p_\theta(\tau)}[\cdot]$ exactly isn't possible, since there are millions (or infinitely many) possible trajectories due to randomness in the environment's transitions and the policy's action choices. (We'll see how to get around this with Monte Carlo approximation further below.)

Using the return $r(\tau)$ defined above, this is just $J(\theta) = \mathbb{E}_{\tau \sim p_\theta(\tau)}[r(\tau)]$. Writing out the expectation over the trajectory distribution $p_\theta(\tau)$ gives an equivalent, integral form of the objective:

$$
J(\theta) = \int p_\theta(\tau)\, r(\tau)\, d\tau
$$

To improve the policy using the batch of data we collect with it, we want the gradient $\nabla_\theta J(\theta)$, because gradient ascent will update

$$
\theta \leftarrow \theta + \alpha \nabla_\theta J(\theta)
$$

Taking the gradient:

$$
\nabla_\theta J(\theta) = \nabla_\theta \int p_\theta(\tau)\, r(\tau)\, d\tau
$$

Move the gradient inside the integral:

$$
= \int \nabla_\theta p_\theta(\tau)\, r(\tau)\, d\tau
$$

But $\nabla_\theta p_\theta(\tau)$ is difficult to work with. We don't know how to directly estimate gradients of trajectory probabilities.[^gradient-exists]

The **log-derivative trick** rewrites this into something we can estimate. Since

$$
\nabla_\theta \log p_\theta(\tau) = \frac{\nabla_\theta p_\theta(\tau)}{p_\theta(\tau)},
$$

multiplying both sides by $p_\theta(\tau)$ gives

$$
p_\theta(\tau) \, \nabla_\theta \log p_\theta(\tau) = p_\theta(\tau) \, \frac{\nabla_\theta p_\theta(\tau)}{p_\theta(\tau)} = \nabla_\theta p_\theta(\tau).
$$

Substituting this into the gradient, we replace $\nabla_\theta p_\theta(\tau)$ with $p_\theta(\tau) \, \nabla_\theta \log p_\theta(\tau)$:

$$
\nabla_\theta J(\theta) = \int p_\theta(\tau) \, \nabla_\theta \log p_\theta(\tau) \, r(\tau) \, d\tau
$$

This now looks like an expectation, since $\mathbb{E}_{x \sim p}[f(x)] = \int p(x) f(x) \, dx$. Therefore

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \nabla_\theta \log p_\theta(\tau) \, r(\tau) \right]
$$

Intuitively, this term reweights the policy update by how good the trajectory turned out to be.[^reward-sign-intuition]

This can be estimated using Monte Carlo approximation. A fundamental fact from probability: if $X \sim p(x)$, then

$$
\mathbb{E}[f(X)] \approx \frac{1}{N} \sum_{i=1}^{N} f(X_i)
$$

for samples $X_1, \dots, X_N$ drawn from $p$. After collecting $N$ trajectories by running the policy,

$$
\frac{1}{N} \sum_{i=1}^{N} \nabla_\theta \log p_\theta(\tau_i) \, r(\tau_i)
$$

is an unbiased estimate of $\nabla_\theta J(\theta)$.

Going back to the original gradient integral, $\int \nabla_\theta p_\theta(\tau) \, r(\tau) \, d\tau$: why couldn't we have estimated that one directly with Monte Carlo, instead of going through the log-derivative trick?[^why-mc-fails-directly]

### We don't need the environment dynamics

$\nabla_\theta \log p_\theta(\tau)$ can be expanded further. Using the [trajectory factorization](#trajectory-factorization),

$$
\log p_\theta(\tau) = \log p(s_1) + \sum_{t=1}^{T} \log \pi_\theta(a_t \mid s_t) + \sum_{t=1}^{T} \log p(s_{t+1} \mid s_t, a_t),
$$

and differentiating with respect to $\theta$:

$$
\nabla_\theta \log p_\theta(\tau) = \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t),
$$

since the initial state distribution $p(s_1)$ and the environment dynamics $p(s_{t+1} \mid s_t, a_t)$ don't depend on $\theta$, only the policy does, so their gradients vanish. This is a huge simplification: computing $\nabla_\theta J(\theta)$ no longer requires knowing the environment's transition probabilities at all, only the policy's own log-probabilities, which we have direct, analytical access to. The gradient and its Monte Carlo estimate become

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \left( \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right) r(\tau) \right] \approx \frac{1}{N} \sum_{i=1}^{N} \left( \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \right) r(\tau_i)
$$

### Full algorithm

Putting it all together, this is the online RL loop from earlier, made concrete. This is the "REINFORCE algorithm," the vanilla policy gradient:

<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 1.25rem 1rem;">

1. Sample trajectories $\{\tau^i\}$ by running the current policy $\pi_\theta(a_t \mid s_t)$ in the environment.
2. Estimate the gradient: $\nabla_\theta J(\theta) \approx \sum_i \left( \sum_t \nabla_\theta \log \pi_\theta(a_t^i \mid s_t^i) \right) \left( \sum_t r(s_t^i, a_t^i) \right)$.[^mc-worked-example]
3. Update the policy: $\theta \leftarrow \theta + \alpha \nabla_\theta J(\theta)$.

</div>

Then repeat from step 1 with the updated policy.

This algorithm works, but it is noisy and has very high variance. A single lucky episode with a huge reward can dominate the gradient estimate.[^high-variance-example]

[^wiki]: Adapted from Wikipedia, ["Policy gradient method"](https://en.wikipedia.org/wiki/Policy_gradient_method).

[^reward-sign-intuition]: The update for a trajectory $\tau_i$ is $r(\tau_i) \sum_t \nabla_\theta \log \pi_\theta(a_t \mid s_t)$: it scales the gradient of the log-probability of the actions taken by how much reward they earned. If a trajectory gets a large reward, $r(\tau)$ is positive and large, and gradient ascent increases $\log \pi_\theta(a_t \mid s_t)$ for the actions taken: "these actions led to success, make them more likely." If the reward is low or negative, the opposite happens: "these actions were bad, reduce their probability."

    <figure>
      <img src="/images/notes/reward-landscape-trajectories.jpg" alt="A 3D reward landscape with three trajectories climbing toward higher reward; two reach a high-reward peak (marked with checkmarks) and one plateaus at a low-reward region (marked with an X)." width="400" />
      <figcaption>Trajectories that climb toward higher reward get reinforced; ones that don't, don't. Source: <a href="https://cs224r.stanford.edu/">Stanford CS224R</a>.</figcaption>
    </figure>

    Concretely, suppose a trajectory gets $R_i = 100$. Then

    $$
    100 \left( \sum_t \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right)
    $$

    is a large update, and the actions in that trajectory become more likely. If instead $R_i = 0$, there's almost no update. If $R_i = -50$, the update flips direction entirely: the policy learns "avoid doing what I just did."

[^mc-worked-example]: Suppose we collect 3 episodes:

    | Episode | Return | $\sum_t \nabla_\theta \log \pi_\theta$ |
    |---|---|---|
    | 1 | 10 | 2 |
    | 2 | 5 | 1 |
    | 3 | 20 | 3 |

    Each episode's contribution is $g_i = \left( \sum_t \nabla_\theta \log \pi_\theta \right) \times \text{return}$:

    $$
    g_1 = 2 \times 10 = 20, \quad g_2 = 1 \times 5 = 5, \quad g_3 = 3 \times 20 = 60
    $$

    Averaging over the 3 episodes:

    $$
    \frac{20 + 5 + 60}{3} = 28.3
    $$

    which gives the update $\theta \leftarrow \theta + \alpha (28.3)$.

[^high-variance-example]: Take the same 3 episodes, but suppose episode 3 happened to get a lucky return of $1000$ instead of $20$:

    | Episode | Return | $\sum_t \nabla_\theta \log \pi_\theta$ | $g_i$ |
    |---|---|---|---|
    | 1 | 10 | 2 | 20 |
    | 2 | 5 | 1 | 5 |
    | 3 | 1000 | 3 | 3000 |

    The average becomes $\frac{20 + 5 + 3000}{3} \approx 1008$, almost entirely determined by episode 3. Resample a different batch of 3 episodes without that lucky outlier, and the estimate could be back down near $28$, even though the policy hasn't changed at all. That swing between batches, driven by which episodes happened to be sampled, is the high variance.

[^why-mc-fails-directly]: Plain Monte Carlo only estimates expectations. If you sample trajectories $\tau \sim p_\theta(\tau)$, averaging computes

    $$
    \mathbb{E}_{\tau \sim p_\theta(\tau)}[f(\tau)] = \int p_\theta(\tau) \, f(\tau) \, d\tau,
    $$

    not $\int f(\tau) \, d\tau$. The first expression, $\int \nabla_\theta p_\theta(\tau) \, r(\tau) \, d\tau$, is not an expectation, since there's no $p_\theta(\tau)$ multiplying the integrand. If you ran the policy and averaged $\nabla_\theta p_\theta(\tau_i) \, r(\tau_i)$ over the sampled trajectories, the law of large numbers says you'd be estimating

    $$
    \int p_\theta(\tau) \, \nabla_\theta p_\theta(\tau) \, r(\tau) \, d\tau,
    $$

    a different integral, not the one we want. Short of that, the only way to compute $\int \nabla_\theta p_\theta(\tau) \, r(\tau) \, d\tau$ exactly is brute force: enumerate every possible trajectory, which is infeasible since there are enormously many of them, often effectively infinite.

    After the log-derivative trick, using $\nabla_\theta p_\theta(\tau) = p_\theta(\tau) \, \nabla_\theta \log p_\theta(\tau)$, the integral becomes

    $$
    \int p_\theta(\tau) \, \nabla_\theta \log p_\theta(\tau) \, r(\tau) \, d\tau,
    $$

    which now is an expectation:

    $$
    \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \nabla_\theta \log p_\theta(\tau) \, r(\tau) \right].
    $$

[^gradient-exists]: It's not that the gradient doesn't exist; it's that it's not convenient to estimate directly from data.

    Recall the [factorization](#trajectory-factorization) of $p_\theta(\tau)$:

    $$
    p_\theta(\tau) = p(s_1) \prod_{t=1}^{T} \pi_\theta(a_t \mid s_t) \, p(s_{t+1} \mid s_t, a_t)
    $$

    Differentiating $\nabla_\theta p_\theta(\tau)$ means differentiating this entire product with respect to $\theta$:

    $$
    \nabla_\theta \left( p(s_1) \prod_{t=1}^{T} \pi_\theta(a_t \mid s_t) \, p(s_{t+1} \mid s_t, a_t) \right)
    $$

    In reinforcement learning we usually don't know the environment's transition probabilities. We can sample transitions by interacting with the environment, but we don't have an analytical formula for them.

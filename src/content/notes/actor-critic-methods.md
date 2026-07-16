---
title: Actor-Critic Methods
description: "How actor-critic methods combine a learned policy with a learned value function: the V, Q, and advantage functions, and where they fit into policy gradients."
date: 2026-07-14
updated: 2026-07-16
---

Actor-critic methods build on [policy gradients](/notes/policy-gradients/): alongside the policy (the "actor"), they learn a value function (the "critic") to judge how good the actor's actions are, giving a lower-variance learning signal than the raw Monte Carlo returns used in vanilla policy gradient.

## Motivation: policy gradient makes inefficient use of data

Even with [reward-to-go](/notes/policy-gradients/#reward-to-go-fixing-credit-assignment), which already stops an action from being blamed for rewards that came *before* it, policy gradient still only has one sampled rollout to learn from. Whatever happens *after* an action in that one particular trajectory still gets baked into its credit, whether or not it's representative of what usually happens when the policy takes that action. Good and bad actions inside the same trajectory end up reinforced or punished together.[^walking-inefficiency-example]

This is sharpest under [sparse rewards](/notes/policy-gradients/#limits-of-baselines-sparse-rewards), where the only nonzero signal arrives once, at the very end of the episode. Two trajectories that make very different amounts of real progress toward the goal, but happen to land on the same final reward, get treated as equally good, or equally useless. The algorithm has no way to see the difference.[^folding-inefficiency-example]

All policy gradient ever knows is that a trajectory succeeded or failed as a whole; it has no notion of how good any specific state or action was on its own. That is exactly the gap a learned critic is built to fill: an estimate of a state's or action's expected future reward, averaged over the policy's actual behavior, rather than one noisy, one-off realization of it.

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

## From reward-to-go to Q: a lower-variance estimator

Recall the [reward-to-go](/notes/policy-gradients/#reward-to-go-fixing-credit-assignment) estimator,

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \, G_{i,t}, \qquad G_{i,t} = \sum_{t'=t}^{T} r(s_{i,t'}, a_{i,t'})
$$

This update increases the probability of actions that led to large future rewards. But $G_{i,t}$ is only ever computed from *one* sampled rollout: it's an *estimate* of the future reward, not the future reward itself. The same first action can lead to wildly different futures.

<figure>
  <img src="/images/notes/many-possible-futures.jpg" alt="A single trajectory arrives at a state (green dot), from which many different future trajectories branch out and upward, each summing to a different total reward." width="300" />
  <figcaption>From a single state, many different futures are possible, each earning a different reward; a sampled rollout only ever realizes one of them. Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
</figure>

This is exactly the high variance from the [motivation](#motivation-policy-gradient-makes-inefficient-use-of-data) above, made concrete: $G_{i,t}$ swings with whichever future happened to get sampled, even though the action itself, taking $a_t$ at $s_t$, is the same every time.[^one-sample-example]

A better estimate averages over *every* possible future after taking $a_t$ in $s_t$, instead of relying on the one future that happened to get sampled:

$$
\sum_{t'=t}^{T} \mathbb{E}_\pi\left[ r_{t'} \mid s_t, a_t \right]
$$

This is exactly the $Q$-function [defined above](#preliminaries): the expected future reward from taking $a_t$ at $s_t$ and then following $\pi$. Substituting $Q^{\pi_\theta}(s_t, a_t)$ for the sampled reward-to-go $G_{i,t}$ gives a new, lower-variance estimator:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \, Q^{\pi_\theta}(s_{i,t}, a_{i,t})
$$

Instead of saying "this one rollout earned reward 8," this says "this action is generally worth about 8": the update is now driven by an averaged, expected value, rather than one noisy, one-off realization of it.

## What the Q-function learns

Instead of trusting a single rollout, the critic accumulates experience across many episodes: every time the policy takes action $a$ at state $s$, it records the return that followed, and averages over all of them.[^q-averaging-example] This average is exactly the Monte Carlo estimate of $Q^\pi(s, a)$ defined above, just computed from many rollouts instead of one.

Suppose that after enough episodes, this average settles at $Q(s, a) = 6.8$. The policy update no longer uses the reward of $2$ that one sampled rollout happened to return; it uses $6.8$, the critic's running average over everything it has seen.

## Q still depends on the state, not just the action

Even $Q^\pi(s, a)$ has a subtle flaw: it mixes together how good the state $s$ already is with how good the specific action $a$ is. In a position that's already winning, every legal move can look great under $Q$, not because any one move is exceptional, but because the state itself already guarantees a good outcome.[^chess-example]

The fix is to stop asking "is this action good?" in absolute terms, and instead ask "is this action better than what I usually do from this state?" That's exactly what the advantage function $A^\pi(s, a) = Q^\pi(s, a) - V^\pi(s)$ measures: subtracting off the state's own average value, $V^\pi(s) = \mathbb{E}_{a \sim \pi}[Q^\pi(s, a)]$, removes whatever part of $Q^\pi(s, a)$ was just "the state is good," leaving only the part attributable to the action itself.[^chess-advantage-example]

Plugging $A^{\pi_\theta}$ into the gradient in place of $Q^{\pi_\theta}$ gives the actor-critic estimator:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \, A^{\pi_\theta}(s_{i,t}, a_{i,t})
$$

Better estimates of $A^\pi$ lead to less noisy gradients. The actor no longer chases large absolute rewards caused by simply being in a good state; it updates based on whether an action was better or worse than expected from that specific state, a more stable and efficient learning signal.

## The actor-critic loop

Fitting $V^\pi$, $Q^\pi$, or $A^\pi$ turns actor-critic into a small extension of the [online RL loop](/notes/policy-gradients/#online-rl): collect a batch of data with the current policy, fit a model to estimate the expected return, then use that fitted estimate to improve the policy.

<figure>
  <img src="/images/notes/actor-critic-loop.jpg" alt="Actor-critic loop diagram: run the policy to collect a batch of data, fit a model to estimate expected return by estimating V^π, Q^π, or A^π, improve the policy via θ ← θ + ∇_θ J(θ), then repeat." />
  <figcaption>Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
</figure>

You estimate value metrics like the State-Value $V^\pi$, Action-Value $Q^\pi$, or the Advantage $A^\pi$ (which is seen in the top equation). This gives you the ground truth weight needed for your gradient update.

In practice, this fitted model is a neural network: it takes a state $s$ as input and outputs an estimate $\hat{V}^\pi(s)$, with its own parameters $\phi$, separate from the policy's parameters $\theta$.

<figure>
  <img src="/images/notes/value-network.jpg" alt="A feedforward neural network taking state s as input and outputting an estimate V-hat^π(s), with its own parameters φ." width="350" />
  <figcaption>Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
</figure>

## Bootstrapping: expressing Q with just V

Fitting a network for $V^\pi$ alone, without a separate $Q$-network, is enough. Start from $Q^\pi(s_t, a_t)$ written as a sum of expected future rewards, and pull out the very first one, the reward that arrives immediately after taking $a_t$:

$$
\begin{aligned}
Q^\pi(s_t, a_t) &= \sum_{t'=t}^{T} \mathbb{E}_{\pi_\theta} \left[ r(s_{t'}, a_{t'}) \mid s_t, a_t \right] \\
&= r(s_t, a_t) + \sum_{t'=t+1}^{T} \mathbb{E}_{\pi_\theta} \left[ r(s_{t'}, a_{t'}) \mid s_t, a_t \right] \\
&= r(s_t, a_t) + \mathbb{E}_{s_{t+1} \sim p(\cdot \mid s_t, a_t)} \left[ V^\pi(s_{t+1}) \right] \\
&\approx r(s_t, a_t) + V^\pi(s_{t+1}) \quad \text{(use the sampled } s_{t+1}\text{)}
\end{aligned}
$$

Everything after the first reward is, by definition, exactly $V^\pi(s_{t+1})$: the expected future reward from following $\pi$ starting at the next state. There's an expectation, $\mathbb{E}[V^\pi(s_{t+1})]$, because after your action, many next states are possible. But in reinforcement learning we only ever experience one next state per rollout: current state, action, observed next state, no branching. So the last line approximates that expectation with the one sampled next state: it plugs in $V^\pi$ evaluated at the $s_{t+1}$ that was actually observed, instead of averaging over all of them.

This is called **bootstrapping**: using the current value estimate itself to stand in for future rewards, instead of needing a whole separate rollout (or a model of the environment's dynamics) to know what happens next.

Substituting this into the advantage function, $A^\pi(s_t, a_t) = Q^\pi(s_t, a_t) - V^\pi(s_t)$:

$$
A^\pi(s_t, a_t) \approx r(s_t, a_t) + V^\pi(s_{t+1}) - V^\pi(s_t) \quad \text{Let's just fit } V^\pi!
$$

No $Q$-network required: the advantage, which needed $Q^\pi$ a moment ago, can now be computed from $V^\pi$ alone, plus the one reward that was actually observed.

[^walking-inefficiency-example]: Consider a robot walking, where a good start is undone by one bad step:

    | Step | Action | Outcome |
    |---|---|---|
    | 1 | forward | ✓ |
    | 2 | forward | ✓ |
    | 3 | backward | ✗, robot falls |

    The trajectory's total reward is bad, because of the fall. Vanilla policy gradient only sees that one bad number for the whole trajectory, so it decreases the probability of every action in it, forward included: it pushes down the likelihood of stepping forward. But the first two forward steps were good; only the backward step at step 3 caused the fall. Policy gradient can't tell the two apart, because both actions get scored by the same trajectory-wide outcome.

[^folding-inefficiency-example]: Consider three attempts by a robot to fold a jacket, with reward given only at the very end of the episode:

    | Trajectory | Outcome | Reward |
    |---|---|---|
    | $\tau_2$ | Folds only the sleeves | $0$ |
    | $\tau_3$ | Flattens the jacket but doesn't fold it | $0$ |
    | $\tau_4$ | Folds it completely | $1$ |

    Policy gradient only sees the reward column: $\tau_4$ gets reinforced, while $\tau_2$ and $\tau_3$ are both treated as equally useless failures. But $\tau_2$ and $\tau_3$ each made real progress toward the goal; the algorithm has no way to see that, because the only feedback it ever gets is the final number.

[^one-sample-example]: Suppose taking action $a_t$ at state $s_t$ could lead to four possible future paths:

    | Path | Reward |
    |---|---|
    | A | $10$ |
    | B | $2$ |
    | C | $0$ |
    | D | $7$ |

    Vanilla policy gradient only ever samples one of these paths per rollout. If it happens to observe path B, it sees a reward of $2$ and credits $a_t$ accordingly. But that doesn't mean $a_t$ is only worth $2$.

[^q-averaging-example]: Suppose the critic has recorded the return that followed taking action $a$ at state $s$, across several episodes:

    | Episode | Return |
    |---|---|
    | 1 | $2$ |
    | 2 | $10$ |
    | 3 | $7$ |
    | 4 | $0$ |
    | 5 | $8$ |
    | 6 | $9$ |
    | 7 | $5$ |
    | $\dots$ | $\dots$ |

    Averaging over all of these episodes,

    $$
    Q(s, a) \approx \frac{2 + 10 + 7 + 0 + 8 + 9 + 5 + \cdots}{\text{number of episodes}} = 6.8
    $$

    a single noisy sample (episode 1's return of $2$) is far from this average; the critic's job is to converge toward $6.8$, not toward whatever any one episode happened to return.

[^chess-example]: Suppose you're playing chess in an already-winning position, with three legal moves, every one of which still leads to a win:

    | Move | $Q$-value |
    |---|---|
    | Queen | $100$ |
    | Bishop | $98$ |
    | Pawn | $96$ |

    All three numbers are large mostly because the state is already fantastic, close to a guaranteed win, not because any individual move is exceptional. Using $Q$ directly would credit all three moves with a huge update, even though none of them is meaningfully better than the others.

[^chess-advantage-example]: Continuing the chess example above, the state's value is the average $Q$-value over the three moves, $V(s) = \frac{100 + 98 + 96}{3} = 98$. Subtracting it out gives each move's advantage:

    | Move | $Q$-value | $A(s, a) = Q(s, a) - V(s)$ |
    |---|---|---|
    | Queen | $100$ | $+2$ |
    | Bishop | $98$ | $0$ |
    | Pawn | $96$ | $-2$ |

    Instead of three huge, nearly identical rewards, the advantage shows Queen is mildly better than average, Bishop is exactly average, and Pawn is mildly worse, a much more informative signal than $100$, $98$, and $96$.

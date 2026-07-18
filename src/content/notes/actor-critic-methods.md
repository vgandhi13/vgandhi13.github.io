---
title: Actor-Critic Methods
description: "How actor-critic methods combine a learned policy with a learned value function: the V, Q, and advantage functions, and where they fit into policy gradients."
date: 2026-07-14
updated: 2026-07-18
---

Actor-critic methods build on [policy gradients](/notes/policy-gradients/): alongside the policy (the "actor"), they learn a value function (the "critic") to judge how good the actor's actions are, giving a lower-variance learning signal than the raw Monte Carlo returns used in vanilla policy gradient.

In one line: **policy gradients** observe what was good or bad, then do more of the good stuff; **actor-critic** learns to estimate what's good or bad, then does more of the good stuff. Same recipe, just swapping a noisy observation for a neural network's own estimate of the value function.

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

## Training the value network

Fitting $\hat{V}^\pi_\phi(s)$ turns into an ordinary supervised learning problem: for every state $s_{i,t}$ visited in a batch, use the observed return $y_{i,t} = G_{i,t}$, the actual reward-to-go collected from that state onward, as the regression label.

- **input**: the state $s$
- **target**: the observed return $y$

The loss is standard mean squared error between the network's prediction and this target,

$$
L(\phi) = \frac{1}{2} \sum_i \left( \hat{V}^\pi_\phi(s_i) - y_i \right)^2
$$

training $\phi$ by gradient descent on $L$, exactly like any other regression problem.[^v-loss-example]

Every episode that passes through a given state contributes another noisy sample of the return from there. Training on many of these samples pushes the network's prediction toward their *average*, which is exactly $V^\pi(s)$: the expected return under $\pi$, not any single episode's realization of it.[^v-convergence-example]

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

## Temporal difference learning: bootstrapped targets

The [Monte Carlo target](#training-the-value-network) used above, $y_{i,t} = G_{i,t} = \sum_{t'=t}^{T} r_{i,t'}$, has a practical problem: you can't compute it until the episode is over. If an episode runs for $10{,}000$ steps, the network can't take a single gradient step until step $10{,}000$.

The fix is the same [bootstrapped estimate](#bootstrapping-expressing-q-with-just-v) derived above, now used as the training target itself, instead of just for the advantage:

$$
y = r + \hat{V}^\pi(s')
$$

Instead of waiting for the rest of the episode, the label is available immediately: one observed reward, plus the network's own current guess at everything after it.[^td-target-example]

At first, that guess can be quite wrong. But every gradient step improves $\hat{V}^\pi$ a little, which means every subsequent target $y = r + \hat{V}^\pi(s')$ gets a little more accurate too: the network is teaching itself, bootstrapping better and better labels out of its own improving predictions.

The loss function doesn't change at all, only the target does:

$$
L(\phi) = \frac{1}{2} \left( \hat{V}^\pi(s) - y \right)^2, \qquad y = r + \hat{V}^\pi(s')
$$

Learning is now much faster, since it no longer waits for an episode to end.

This is called **temporal difference (TD) learning** because of what's being compared: the current prediction $\hat{V}^\pi(s)$, against a target built from the *next* time step, $r + \hat{V}^\pi(s')$. Their difference is the **TD error**,

$$
\delta = r + \hat{V}^\pi(s') - \hat{V}^\pi(s)
$$

If $\delta > 0$, the state turned out better than expected, so $\hat{V}^\pi(s)$ should increase. If $\delta < 0$, it turned out worse than expected, so $\hat{V}^\pi(s)$ should decrease.

## Bias vs. variance: Monte Carlo vs. TD

The Monte Carlo target from [training the value network](#training-the-value-network) and the bootstrapped TD target above sit on opposite ends of a classic tradeoff.

The Monte Carlo target, $y = G_{i,t}$, uses the actual future return realized in that one sampled episode. It's unbiased: averaged over enough episodes, it converges to the true $V^\pi(s)$. But it's noisy, since a single episode can be lucky or unlucky, so the label attached to any one state can swing widely from episode to episode.

The TD target, $y = r + \hat{V}^\pi(s')$, uses the current, imperfect estimate $\hat{V}^\pi(s')$ in place of the true value of the next state. Since $\hat{V}^\pi$ can be wrong, especially early in training, this introduces bias: the target itself may be systematically off. But it only depends on one sampled reward, not an entire trajectory's worth of randomness, so it has much lower variance.

- **Monte Carlo**: unbiased, high variance
- **TD**: some bias, lower variance

Monte Carlo trusts the data completely and pays for it in noise; TD trades some of that noise away by trusting its own, imperfect predictions instead.[^mc-td-bias-variance-example]

## N-step returns: a middle ground

Monte Carlo and 1-step TD are two ends of a spectrum: sum every real reward all the way to $T$, or bootstrap after just one. Nothing forces that choice to be so extreme.

<figure>
  <img src="/images/notes/n-step-returns.jpg" alt="Diagram comparing Monte Carlo (sum rewards over the whole trajectory), bootstrapped (one reward plus V), and an n-step return in between (sum rewards over n steps, then plus V) along the same set of trajectories." />
  <figcaption>Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
</figure>

An **n-step return** sums the actual, observed rewards for the first $n$ steps, then bootstraps off $\hat{V}^\pi$ for everything after that:

$$
y_{i,t} = \sum_{t'=t}^{t+n-1} r(s_{i,t'}, a_{i,t'}) + \hat{V}^\pi(s_{i,t+n})
$$

$n=1$ recovers the [1-step TD target](#temporal-difference-learning-bootstrapped-targets) from above; $n=T$ recovers the [Monte Carlo target](#training-the-value-network), with no bootstrapping at all.

In practice, some $n$ strictly in between, $1 < n < T$, often works best: using $n$ real rewards before bootstrapping means less of the estimate leans on $\hat{V}^\pi$ being correct, so it has less variance than Monte Carlo; but it also depends on fewer of the single sampled trajectory's rewards than the full return does, so it has lower bias than the 1-step bootstrap.

## A full algorithm walkthrough

Putting every piece together needs one last bit of notation: the **discount factor** $\gamma \in [0, 1]$, which weights rewards further in the future slightly less than immediate ones (everywhere above has implicitly used $\gamma = 1$). With it, the actor-critic algorithm is:

<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 1.25rem 1rem;">

1. Sample a batch of trajectories $\{(s_{i,1}, a_{i,1}, \dots, s_{i,T}, a_{i,T})\}$ by running the current policy $\pi_\theta$.
2. Fit $\hat{V}_\phi^{\pi_\theta}$ to the summed rewards in the batch.
3. Evaluate the advantage at every timestep,
   $$
   \hat{A}^{\pi_\theta}(s_{t,i}, a_{t,i}) = r(s_{t,i}, a_{t,i}) + \gamma \hat{V}_\phi^{\pi_\theta}(s_{t+1,i}) - \hat{V}_\phi^{\pi_\theta}(s_{t,i}), \qquad \forall t, i
   $$
4. Evaluate the policy gradient,
   $$
   \nabla_\theta J(\theta) \approx \sum_{t,i} \nabla_\theta \log \pi_\theta(a_{t,i} \mid s_{t,i}) \, \hat{A}^{\pi_\theta}(s_{t,i}, a_{t,i})
   $$
5. Update the policy, $\theta \leftarrow \theta + \alpha \nabla_\theta J(\theta)$.

</div>

Then repeat from step 1 with the newly updated policy.

Step 2's target and loss are exactly the [n-step return](#n-step-returns-a-middle-ground) from above, now with discounting folded in:

$$
y_{i,t} = \sum_{t'=t}^{t+n-1} \gamma^{t'-t} r(s_{i,t'}, a_{i,t'}) + \gamma^n \hat{V}_\phi^\pi(s_{i,t+n})
$$

$$
\mathcal{L}(\phi) = \frac{1}{2} \sum_{i} \left\Vert \hat{V}_\phi^\pi(s_i) - y_{i} \right\Vert^2
$$

Steps 1 and 4 are the actor: the policy network $\pi_\theta(a \mid s)$, updated by the policy gradient. Steps 2 and 3 are the critic: the value network $\hat{V}^\pi_\phi(s)$, whose bootstrapped estimate turns raw rewards into the advantage the actor learns from. Two separate networks, trained together, each taking the same state $s$ as input, giving the method its name.

<figure>
  <img src="/images/notes/actor-critic-networks.jpg" alt="Two neural networks side by side, both taking state s as input: one outputting π_θ(a|s), the other outputting V-hat^π(s), labeled 'actor-critic algorithm'." />
  <figcaption>Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
</figure>

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

[^v-loss-example]: Suppose the network currently predicts $\hat{V}^\pi(s) = 5$ for some state, but the observed return from that state was $6$. The loss is $(5 - 6)^2 = 1$. After enough gradient steps on examples like this one, the prediction gradually climbs toward the target:

    | Step | Prediction |
    |---|---|
    | Before training | $5$ |
    | After some training | $5.7$ |
    | After more training | $5.95$ |
    | Eventually | $6$ |

[^v-convergence-example]: Suppose state $S$ shows up across five different episodes, with observed returns $5$, $8$, $6$, $9$, and $7$. The network sees the training pairs $(S, 5)$, $(S, 8)$, $(S, 6)$, $(S, 9)$, $(S, 7)$, one per episode. Minimizing squared error across all of them pulls the prediction toward their average, $\frac{5+8+6+9+7}{5} = 7$, so the network learns $\hat{V}^\pi(S) \approx 7$, close to the state's true expected return.

[^td-target-example]: Suppose the immediate reward is $r = 2$, and the network's current prediction for the next state is $\hat{V}^\pi(s') = 5$. The bootstrapped target is $y = 2 + 5 = 7$, available right away, without waiting to see how the rest of the episode plays out.

[^mc-td-bias-variance-example]: Consider two episodes running through the same two states, Pink and Blue, before reaching a terminal:

    <figure>
      <img src="/images/notes/mc-td-example.jpg" alt="A trajectory running through a pink state, then a blue state, branching to either a green terminal (reward +1) or a red terminal (reward -1), with reward 0 elsewhere along the path." width="280" />
      <figcaption>Source: <a href="https://cs224r.stanford.edu/slides/04_cs224r_actor_critic_2026.pdf">Stanford CS224R</a>.</figcaption>
    </figure>

    - Episode 1: Blue $\to$ Green ($+1$)
    - Episode 2: Pink $\to$ Blue $\to$ Red ($-1$)

    | Estimate | Value | Why |
    |---|---|---|
    | $MC(\text{Blue})$ | $0$ | Blue was visited twice, with returns $+1$ and $-1$. Average $= \frac{1 + (-1)}{2} = 0$. |
    | $MC(\text{Pink})$ | $-1$ | Pink was visited only once, and that episode ended at the red terminal. Return $= -1$. |
    | $TD(\text{Blue})$ | $0$ | Blue is followed by a different state in each episode, Green in episode 1, Red in episode 2, and both are terminal, so $V(\text{terminal}) = 0$. Its TD target in episode 1 is $r(\text{Blue}, \text{Green}) + V(\text{Green}) = 1 + 0 = 1$; in episode 2 it's $r(\text{Blue}, \text{Red}) + V(\text{Red}) = -1 + 0 = -1$. Blue sees both targets over training, and gradient descent on the two squared errors pulls its estimate toward their average, $\frac{1 + (-1)}{2} = 0$. |
    | $TD(\text{Pink})$ | $0$ | The TD target for Pink is $r + V(\text{Blue}) = 0 + 0 = 0$, since Blue has already learned a value of $0$ after the two episodes. |

    The key difference: Monte Carlo uses the actual return from the episode, while TD uses the immediate reward plus the estimated value of the next state. That's why $MC(\text{Pink}) = -1$: it saw the whole bad outcome. But $TD(\text{Pink}) = 0$: it only looks one step ahead to Blue, whose estimated value is already $0$.

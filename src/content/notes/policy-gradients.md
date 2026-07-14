---
title: Policy Gradients
description: "RL and MDP preliminaries: states, actions, trajectories, and the expected-reward objective."
date: 2026-07-12
updated: 2026-07-14
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

This note only covers the online case.

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

### Reward-to-go: fixing credit assignment

One natural question comes up: why should an action at time $t$ get credit (or blame) for rewards that happened *before* it? Policy behavior at time $t$ can't affect rewards at $t' < t$; future actions cannot change the past.[^credit-assignment-example]

Causality says we should only weight $\nabla_\theta \log \pi_\theta(a_t \mid s_t)$ by the rewards that came after it, not the whole trajectory's return. So we replace

$$
\sum_{t'=1}^{T} r_{t'}
$$

with the **reward-to-go**,

$$
\sum_{t'=t}^{T} r_{t'}
$$

giving a new estimator:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \left( \sum_{t'=t}^{T} r(s_{i,t'}, a_{i,t'}) \right)
$$

Before, every action in a trajectory was weighted by the same total return. Now, each action is weighted only by the rewards that came after it, the only ones it could have influenced. Removing this irrelevant past-reward noise decreases variance, while the expected gradient stays correct.[^reward-to-go-example]

### Baselines: centering the reward

Even with reward-to-go, there's still a problem.[^baseline-problem-example] If every trajectory in a batch gets a similar, uniformly positive reward, REINFORCE increases the probability of all of them, even the relatively worst one, since it only looks at each trajectory's raw reward, not how it compares to the rest of the batch.

To fix this, we introduce a **baseline** $b$ and subtract it from the reward:

$$
\nabla_\theta J(\theta) = \mathbb{E}\left[ \nabla_\theta \log p_\theta(\tau) \left( r(\tau) - b \right) \right]
$$

A natural choice is the batch's average reward,

$$
b = \frac{1}{N} \sum_{i=1}^{N} r(\tau_i)
$$

so instead of weighting by $r(\tau)$, we weight by how much better or worse than average each trajectory did.[^baseline-applied-example] This also reduces variance: rewards that used to be large, similar numbers become small numbers centered at zero, so the gradient magnitude no longer swings wildly from batch to batch.[^baseline-variance-example]

Subtracting a constant baseline doesn't bias the gradient. In expectation,

$$
\mathbb{E}\left[ \nabla_\theta \log p_\theta(\tau) \left( r(\tau) - b \right) \right] = \mathbb{E}\left[ \nabla_\theta \log p_\theta(\tau) \, r(\tau) \right],
$$

so the estimator stays unbiased. (The full proof isn't given here; see [Stanford CS224R's policy gradient slides](https://cs224r.stanford.edu/slides/03_cs224r_policy_gradients_2026.pdf).) The average reward is a pretty good baseline: unbiased, and lower variance.

### Limits of baselines: sparse rewards

Even with a baseline, policy gradient still struggles when the reward is sparse, given only once at the very end of a trajectory. The baseline centers a trajectory's *total* return around the batch average, but it can't see inside the trajectory: two trajectories that happen to end with the same final reward get exactly the same weight, even if one made real progress along the way and the other made none at all.[^sparse-reward-example]

Because the reward is sparse, the gradient doesn't know which specific action along the timeline was good or bad; it just scales the entire sequence of actions by the same final number. Policy gradient is still noisy and high-variance in this regime: even with a baseline, it struggles to tell "close failures" from "total failures" apart. Fixing this needs either **dense rewards** (small intermediate rewards for sub-steps toward the goal) or **large batches**, so the noise averages out over enough samples.

### Implementing this efficiently: the surrogate objective

Putting [reward-to-go](#reward-to-go-fixing-credit-assignment) and the baseline together, the full estimator is

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \left( G_{i,t} - b \right), \qquad G_{i,t} = \sum_{t'=t}^{T} r(s_{i,t'}, a_{i,t'})
$$

Computing this naively means calling `backward()` once per state-action pair: differentiate $\log \pi_\theta(a_t \mid s_t)$, multiply by its own $(G_t - b)$, and sum. That's a lot of individual backward passes.[^naive-backward-count]

Deep learning frameworks are built around a single scalar loss and one `backward()` call, not thousands of gradients accumulated by hand. So instead we construct a scalar **surrogate objective** $\tilde{J}(\theta)$: not the true objective $J(\theta) = \mathbb{E}[r]$, but a quantity whose gradient happens to equal the policy gradient we actually want:

$$
\tilde{J}(\theta) = \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \log \pi_\theta(a_{i,t} \mid s_{i,t}) \left( G_{i,t} - b \right)
$$

$(G_{i,t} - b)$ comes from the environment and the batch of collected data, not from the network, so autograd treats it as a constant with no dependence on $\theta$. Differentiating $\tilde{J}(\theta)$ therefore only differentiates $\log \pi_\theta(a_{i,t} \mid s_{i,t})$, carrying $(G_{i,t} - b)$ straight through:

$$
\nabla_\theta \left[ \log \pi_\theta(a_t \mid s_t) \left( G_t - b \right) \right] = \left( G_t - b \right) \nabla_\theta \log \pi_\theta(a_t \mid s_t)
$$

which is exactly the policy gradient term above. A single `backward()` call on $\tilde{J}(\theta)$ therefore gives the same gradient as summing every individual term by hand.[^surrogate-not-loss]

$\log \pi_\theta(a_t \mid s_t)$ is also exactly the term that shows up in maximum likelihood training: for classification, cross-entropy loss is $-\log p(y \mid x)$. The policy gradient loss, $-\log \pi_\theta(a_t \mid s_t) \, (G_t - b)$, is the same thing weighted by $(G_t - b)$, a **weighted maximum likelihood** that pushes up the log-probability of actions in proportion to how much better than the baseline they did.

In PyTorch, this is:

```python
log_probs = policy.log_prob(actions)
loss = -(log_probs * advantages).mean()

optimizer.zero_grad()
loss.backward()
optimizer.step()
```

where `advantages` holds $(G_t - b)$ per timestep, and the sign is flipped since optimizers minimize by convention.

### On-policy vs. off-policy

Every variant of the estimator covered so far, from vanilla REINFORCE through reward-to-go, the baseline, and the surrogate objective, shares one property: the expectation $\mathbb{E}_{\tau \sim p_\theta(\tau)}[\cdot]$ is over trajectories sampled from the *current* policy $\pi_\theta$. But step 3 of the [full algorithm](#full-algorithm) changes $\theta$. Once that happens, the trajectories used to compute that gradient no longer come from the policy we're now trying to improve, so we have to go back to step 1 and collect a fresh batch under the new $\theta$ before taking another gradient step.

<figure>
  <img src="/images/notes/on-off-policy-definitions.jpg" alt="Definitions: on-policy, an update uses only data from the current policy. Off-policy, an update can reuse data from other, past policies." width="400" />
  <figcaption>Source: <a href="https://cs224r.stanford.edu/">Stanford CS224R</a>.</figcaption>
</figure>

Every estimator above is **on-policy**: each gradient step needs its own brand-new batch of trajectories, and none of the old data can be reused once $\theta$ changes. That makes them sample-inefficient.

### Importance sampling: reusing old trajectories

Being on-policy means all the old data is, technically, invalid the moment the policy changes: we need fresh rollouts under the new $\theta$ at every single gradient step, which is expensive. **Importance sampling** gives a way to reuse trajectories collected under an older policy instead.

The general trick: suppose we want an expectation under a distribution $p$,

$$
\mathbb{E}_{x \sim p(x)}[f(x)] = \int p(x) \, f(x) \, dx
$$

but only have samples from a different distribution $q(x)$. Multiplying the integrand by $\frac{q(x)}{q(x)} = 1$,

$$
\int p(x) \, f(x) \, dx = \int q(x) \, \frac{p(x)}{q(x)} \, f(x) \, dx = \mathbb{E}_{x \sim q(x)} \left[ \frac{p(x)}{q(x)} \, f(x) \right]
$$

so an expectation under $p$ can be estimated from samples drawn from $q$ instead, as long as each sample is reweighted by the **importance weight** $\frac{p(x)}{q(x)}$.

Applying this to the policy gradient objective: we want $J(\theta) = \mathbb{E}_{\tau \sim p_\theta(\tau)}[r(\tau)]$, the expectation under the *current* policy $\pi_\theta$, but only have trajectories $\tau \sim \bar{p}(\tau)$ collected under an older policy $\bar\pi$. Importance sampling rewrites the objective as

$$
J(\theta) = \mathbb{E}_{\tau \sim \bar{p}(\tau)} \left[ \frac{p_\theta(\tau)}{\bar{p}(\tau)} \, r(\tau) \right]
$$

so the old trajectories can be reused, each one reweighted by the **correction factor** $\frac{p_\theta(\tau)}{\bar{p}(\tau)}$: how much more (or less) likely that trajectory would be under the new policy than under the old one.

To compute this correction factor, recall the [trajectory factorization](#trajectory-factorization) $p_\theta(\tau) = p(s_1) \prod_{t=1}^{T} \pi_\theta(a_t \mid s_t) \, p(s_{t+1} \mid s_t, a_t)$, and likewise for the old policy, $\bar{p}(\tau) = p(s_1) \prod_{t=1}^{T} \bar\pi(a_t \mid s_t) \, p(s_{t+1} \mid s_t, a_t)$. Both trajectories were generated in the same environment, so the initial state distribution $p(s_1)$ and the dynamics $p(s_{t+1} \mid s_t, a_t)$ are identical top and bottom, and cancel out of the ratio:[^is-cancellation-visual]

$$
\frac{p_\theta(\tau)}{\bar{p}(\tau)} = \prod_{t=1}^{T} \frac{\pi_\theta(a_t \mid s_t)}{\bar\pi(a_t \mid s_t)}
$$

leaving only a ratio of policy probabilities. We never need to know the environment dynamics, only the old and new policies' probabilities of the actions actually taken.[^importance-weight-example]

### Off-policy policy gradient

Combining reward-to-go, the baseline, and importance sampling gives a full **off-policy** policy gradient: update the latest policy $\pi_\theta$ using trajectories sampled from an old policy $\bar\pi$, instead of $\pi_\theta$ itself.

Start from the on-policy reward-to-go-with-baseline estimator, written as an exact expectation:

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \left( \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right) \left( G_t - b \right) \right]
$$

The problem: this expectation is over trajectories $\tau \sim p_\theta(\tau)$, sampled from the very policy we're trying to update, exactly the data we don't have.

Using [importance sampling](#importance-sampling-reusing-old-trajectories), rewrite the expectation over the old policy's trajectory distribution $\bar{p}(\tau)$ instead, correcting each sample with the importance weight $\frac{p_\theta(\tau)}{\bar{p}(\tau)}$:

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \bar{p}(\tau)} \left[ \frac{p_\theta(\tau)}{\bar{p}(\tau)} \left( \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right) \left( G_t - b \right) \right]
$$

and substituting in the [per-timestep form](#importance-sampling-reusing-old-trajectories) of that ratio,

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \bar{p}(\tau)} \left[ \underbrace{\prod_{t=1}^{T} \frac{\pi_\theta(a_t \mid s_t)}{\bar\pi(a_t \mid s_t)}}_{\text{Importance ratio}} \cdot \left( \sum_{t=1}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right) \left( G_t - b \right) \right]
$$

This is now genuinely off-policy: it can be computed entirely from trajectories collected under the old policy $\bar\pi$, with no fresh rollouts under $\pi_\theta$ required.

But the product term, $\prod_{t=1}^{T} \frac{\pi_\theta(a_t \mid s_t)}{\bar\pi(a_t \mid s_t)}$, is the catch: it multiplies $T$ per-timestep ratios together, and for longer horizons this product can become vanishingly small or explosively large, since even a small, consistent per-step difference between the two policies compounds multiplicatively over many timesteps.[^is-product-blowup-example]

### Reducing variance: per-timestep importance sampling

Because of this high-variance trajectory-level product, it helps to stop thinking about importance-sampling an entire trajectory at once, and instead importance-sample one timestep, one state-action pair, at a time.[^reward-to-go-parallel] Instead of

$$
\mathbb{E}_{\text{trajectory}}[\cdots]
$$

consider

$$
\mathbb{E}_{\text{state-action}}[\cdots]
$$

Write each timestep's importance ratio as $\rho_t = \frac{\pi_\theta(s_t, a_t)}{\bar\pi(s_t, a_t)}$, and its gradient contribution as $g_t = \nabla_\theta \log \pi_\theta(a_t \mid s_t) \, (G_t - b)$. The **old**, trajectory-level estimator, for a single trajectory, was

$$
\left( \prod_{t=1}^{T} \rho_t \right) \left( \sum_{t=1}^{T} g_t \right)
$$

one giant product of ratios, multiplied by one giant sum of gradient contributions: every $g_t$ in the sum gets scaled by the *same* trajectory-wide weight. The **new**, per-timestep estimator is instead

$$
\sum_{t=1}^{T} \rho_t \, g_t
$$

Now every timestep carries its own weight. Instead of

$$
\text{trajectory} \longrightarrow \text{one huge weight}
$$

we have

- step 1 → its own weight $\rho_1$
- step 2 → its own weight $\rho_2$
- step 3 → its own weight $\rho_3$
- ...

Each $g_t$ is scaled only by its own timestep's ratio, not by a product of every ratio in the trajectory. This is exactly why per-timestep importance sampling reduces variance so dramatically.

But there's a new problem: a policy doesn't output $\pi_\theta(s_t, a_t)$ directly, only $\pi_\theta(a_t \mid s_t)$. Expanding $\pi(s, a)$ with the chain rule of probability, $\pi(s, a) = \pi(a \mid s) \, \pi(s)$, splits $\rho_t$ into two factors:

$$
\rho_t = \frac{\pi_\theta(s_t, a_t)}{\bar\pi(s_t, a_t)} = \frac{\pi_\theta(a_t \mid s_t)}{\bar\pi(a_t \mid s_t)} \cdot \frac{\pi_\theta(s_t)}{\bar\pi(s_t)}
$$

The first factor, the ratio of action probabilities, is easy: both policies hand it to us directly. The second factor, the ratio of *state* marginals, is not. $\pi(s_t)$ isn't something either policy outputs: it's the probability that the agent reaches state $s_t$ at all, which depends on the policy, every action taken before $t$, and the environment's transition dynamics, none of which we have direct access to.

In practice, this state-marginal ratio is just approximated as $1$. If $\pi_\theta$ is only a small update away from $\bar\pi$, the two policies tend to visit nearly the same states, so $\pi_\theta(s_t) \approx \bar\pi(s_t)$ and

$$
\frac{\pi_\theta(s_t)}{\bar\pi(s_t)} \approx 1
$$

This approximation only holds when the two policies are close together.

Substituting it back in gives a fully practical estimator:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^{N} \sum_{t=1}^{T} \underbrace{\frac{\pi_\theta(a_{i,t} \mid s_{i,t})}{\bar\pi(a_{i,t} \mid s_{i,t})}}_{\text{Probability ratio}} \, \nabla_\theta \log \pi_\theta(a_{i,t} \mid s_{i,t}) \left( G_{i,t} - b \right)
$$

The huge trajectory-length product is gone. What's left is a single probability ratio per timestep, far more stable than multiplying together $T$ of them.

---

*This topic is what convinced me to start writing these notes properly and publishing them here, so I can come back later and find the detailed examples waiting in the footnotes instead of re-deriving them from scratch. Made while going through Stanford's [CS224R](https://cs224r.stanford.edu/) and talking it through with GPT-5.5.*

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

[^credit-assignment-example]: Imagine a robot walking:

    | Time | Action | Reward |
    |---|---|---|
    | $t=1$ | step forward | $+1$ |
    | $t=2$ | step forward | $+1$ |
    | $t=3$ | step forward | $+1$ |
    | $t=4$ | big step backward | $-10$ |
    | $t=5$ | step forward | $+1$ |

    Total reward: $1 + 1 + 1 - 10 + 1 = -6$.

    Under the original REINFORCE estimator, every action gets multiplied by this same total return, $R = -6$: $\nabla_\theta \log \pi_\theta(a_1 \mid s_1)$ is scaled by $-6$, and so is $\nabla_\theta \log \pi_\theta(a_2 \mid s_2)$, and so on for every timestep:

    $$
    g = -6 \, \nabla_\theta \log \pi_\theta(a_1) - 6 \, \nabla_\theta \log \pi_\theta(a_2) - 6 \, \nabla_\theta \log \pi_\theta(a_3) - 6 \, \nabla_\theta \log \pi_\theta(a_4) - 6 \, \nabla_\theta \log \pi_\theta(a_5)
    $$

    Even the three good forward steps get blamed: they didn't cause the backward mistake at $t=4$, yet REINFORCE blames the entire trajectory for it.

[^reward-to-go-example]: Using the same rewards ($1, 1, 1, -10, 1$), the reward-to-go estimator gives each action its own future return, $G_t = \sum_{t'=t}^{T} r_{t'}$:

    $$
    G_1 = 1+1+1-10+1 = -6, \quad G_2 = 1+1-10+1 = -7, \quad G_3 = 1-10+1 = -8,
    $$

    $$
    G_4 = -10+1 = -9, \quad G_5 = 1
    $$

    Now each action gets a learning signal that reflects its actual consequences. In particular, $G_5 = 1$: the last forward step, which happened entirely after the mistake, correctly gets a positive signal instead of sharing in the $-6$ blame. The resulting gradient estimate is

    $$
    g = -6 \, \nabla_\theta \log \pi_\theta(a_1) - 7 \, \nabla_\theta \log \pi_\theta(a_2) - 8 \, \nabla_\theta \log \pi_\theta(a_3) - 9 \, \nabla_\theta \log \pi_\theta(a_4) + 1 \, \nabla_\theta \log \pi_\theta(a_5)
    $$

    each action weighted by its own $G_t$ instead of the same flat $-6$.

[^baseline-problem-example]: Suppose we run 3 trajectories:

    | Trajectory | Reward |
    |---|---|
    | $\tau_1$ | 100 |
    | $\tau_2$ | 110 |
    | $\tau_3$ | 105 |

    Average reward: $105$. All three trajectories get a positive update, even $\tau_1$, which is actually the worst trajectory of the batch: REINFORCE just sees "reward $= 100$, increase probability," without accounting for the fact that $100$ is below average.

[^baseline-applied-example]: With $b = 105$: trajectory 1 gets $100 - 105 = -5$, a negative signal, reduce its probability. Trajectory 2 gets $110 - 105 = +5$, a positive signal, increase it. Trajectory 3 gets $105 - 105 = 0$, no update, exactly average behavior. This is a much more informative learning signal than the raw rewards.

[^baseline-variance-example]: Suppose a batch of rewards is $[99, 100, 101, 102, 98]$. Without a baseline, the gradient is scaled by these large, similar numbers, so its magnitude fluctuates with whatever the rewards happen to be. Subtracting the average ($100$) gives $[-1, 0, +1, +2, -2]$: much smaller numbers, centered at zero, with below-average trajectories now correctly getting a negative signal.

[^sparse-reward-example]: Consider training a robot policy $\pi_\theta$ to fold a jacket, with reward $r(s, a)$ given only at the end of the episode: $1.0$ for a neatly folded jacket, $0.5$ for an okay job with some wrinkles, $0$ for failing to fold it at all. Suppose 4 trajectories:

    | Trajectory | Outcome | Reward |
    |---|---|---|
    | $\tau_1$ | Doesn't touch the jacket | $0$ |
    | $\tau_2$ | Folds only the sleeves | $0.5$ |
    | $\tau_3$ | Flattens the jacket but doesn't fold it | $0$ |
    | $\tau_4$ | Folds it perfectly | $1.0$ |

    The baseline is $b = \frac{0 + 0.5 + 0 + 1.0}{4} = 0.375$, and each trajectory's weight is $r(\tau_i) - b$:

    $$
    \tau_1: 0 - 0.375 = -0.375, \qquad \tau_2: 0.5 - 0.375 = +0.125
    $$

    $$
    \tau_3: 0 - 0.375 = -0.375, \qquad \tau_4: 1.0 - 0.375 = +0.625
    $$

    $\tau_1$ and $\tau_3$ get the exact same weight, $-0.375$, even though flattening the jacket ($\tau_3$) is a real step toward folding it, while never touching it ($\tau_1$) makes no progress at all. Because the reward only arrives at the end, the baseline has no way to tell these two failures apart.

[^naive-backward-count]: Suppose $N = 100$ trajectories, each with $T = 1000$ steps. There are $100 \times 1000 = 100{,}000$ terms $\nabla_\theta \log \pi_\theta(a_t \mid s_t)$ in the sum. Calling `backward()` separately for each one would mean 100,000 backward passes, one per state-action pair, far too slow to be practical.

[^surrogate-not-loss]: $\tilde{J}(\theta)$ isn't a meaningful loss value on its own the way a supervised loss is, where a lower number means a better fit. Its only job is to make `loss.backward()` produce the correct gradient; the number itself isn't something worth tracking for its own sake.

[^is-cancellation-visual]: Writing out the full ratio before canceling anything,

    $$
    \frac{p_\theta(\tau)}{\bar{p}(\tau)} = \frac{p(s_1) \prod_{t=1}^{T} \pi_\theta(a_t \mid s_t) \, p(s_{t+1} \mid s_t, a_t)}{p(s_1) \prod_{t=1}^{T} \bar\pi(a_t \mid s_t) \, p(s_{t+1} \mid s_t, a_t)}
    $$

    the initial state distribution and the environment dynamics appear identically in the numerator and denominator, so they cancel:

    $$
    \frac{p_\theta(\tau)}{\bar{p}(\tau)} = \frac{\textcolor{#3b82f6}{\cancel{p(s_1)}} \prod_{t=1}^{T} \pi_\theta(a_t \mid s_t) \, \textcolor{#e07856}{\cancel{p(s_{t+1} \mid s_t, a_t)}}}{\textcolor{#3b82f6}{\cancel{p(s_1)}} \prod_{t=1}^{T} \bar\pi(a_t \mid s_t) \, \textcolor{#e07856}{\cancel{p(s_{t+1} \mid s_t, a_t)}}} = \prod_{t=1}^{T} \frac{\pi_\theta(a_t \mid s_t)}{\bar\pi(a_t \mid s_t)}
    $$

    the initial state distribution (blue) and the transition dynamics (orange) drop out entirely, leaving only the ratio of policy probabilities at each timestep.

[^importance-weight-example]: Suppose a single-step decision between two actions, and the old and new policies assign:

    | Action | $\bar\pi$ (old) | $\pi_\theta$ (new) |
    |---|---|---|
    | Left | 0.8 | 0.4 |
    | Right | 0.2 | 0.6 |

    If the trajectory we collected took **Right**, its importance weight is $w = \frac{\pi_\theta(\text{Right})}{\bar\pi(\text{Right})} = \frac{0.6}{0.2} = 3$: this trajectory becomes three times as important, since the new policy likes Right much more than the old one did. If instead the trajectory had taken **Left**, $w = \frac{\pi_\theta(\text{Left})}{\bar\pi(\text{Left})} = \frac{0.4}{0.8} = 0.5$: it becomes half as important, since the new policy likes Left less than the old one did. This is exactly how old data gets corrected for the policy having changed.

[^is-product-blowup-example]: Suppose every one of the $T$ per-timestep ratios happens to be a modest $1.1$ (the new policy is just slightly more likely to take each action than the old one). Over $T=50$ steps, the product is $1.1^{50} \approx 117$, a huge multiplier. If instead every ratio is $0.9$, the product is $0.9^{50} \approx 0.005$, close to zero. A slight, consistent per-step difference between the two policies compounds multiplicatively over a long trajectory, which is why this off-policy estimator tends to be very high variance in practice.

[^reward-to-go-parallel]: This is similar in spirit to the move from the trajectory's return to the [reward-to-go](#reward-to-go-fixing-credit-assignment) $G_t$ earlier in this note: both replace one trajectory-wide quantity with a separate quantity per timestep. There, the motivation was credit assignment, an action shouldn't be weighted by rewards it couldn't have influenced. Here, the motivation is variance reduction, an action shouldn't be reweighted by a product of every ratio in the trajectory, only its own. Same move, different reason.

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

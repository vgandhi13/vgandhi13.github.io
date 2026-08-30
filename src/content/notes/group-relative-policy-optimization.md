---
title: Reinforcement Learning for Large Language Models
description: Notes on RL methods for training LLMs, including GRPO, the critic-free policy gradient method behind recent reasoning models.
date: 2026-07-30
updated: 2026-08-29
---

Yann LeCun has described intelligence with a cake analogy: "If intelligence is a cake, the bulk
of the cake is unsupervised learning, the icing on the cake is supervised learning, and the
cherry on the cake is reinforcement learning (RL)."

Conventional LLMs typically go through a three-step training pipeline:

1. **Pre-training.** Self-supervised learning on vast swaths of internet data makes up the
   majority of the cake, especially when viewed in compute spent (FLOPs).
2. **Supervised fine-tuning (SFT).** The beginning of post-training.
3. **Reinforcement learning.** Used for alignment and for creating "reasoning" or "thinking"
   models, via RLHF (Reinforcement Learning from Human Feedback) or RLVR (Reinforcement Learning
   with Verifiable Rewards).

## Reinforcement Learning from Human Feedback (RLHF)

TODO: will update this section later.

## Reinforcement Learning with Verifiable Rewards (RLVR)

The training method for these models, Reinforcement Learning with Verifiable Rewards
(RLVR)[^rlvr], proceeds very similarly to RLHF, but it makes the reward model optional in lieu
of a scoring function that returns a positive reward when the answer is correct and 0 otherwise.

RLHF collects human preference data, trains a reward model on it, then optimizes the policy
against that proxy. RLVR skips all of that when you have a ground truth to check against: the
reward signal is the ground truth itself, not a learned approximation of it.

This can be seen as an RL feedback loop where, instead of a reward model, a verification
function scores the agent's completions.

<figure>
  <img src="/images/notes/rlvr-feedback-loop.png" alt="RLVR feedback loop diagram: training data provides prompts to an agent (policy pi-theta), which produces completions; a Verifiable Reward block scores the completion (reward = gamma if correct, else 0) and feeds the scalar reward back to the agent for a policy update" />
  <figcaption>RLVR as an RL feedback loop: a verification function stands in for the reward model. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

See below to see how different it is to score responses for RLHF versus RLVR. In RLHF, a reward
model must evaluate subjective qualities. In contrast, RLVR uses verification functions that
return definitive scores.

<div class="figure-row">

<figure>
  <img src="/images/notes/rlhf-scoring-example.png" alt="RLHF example: a prompt asking to explain opportunity cost in economics, with an open-ended prose response and no verification step, since a reward model must judge subjective quality" />
  <figcaption>RLHF: scoring is a subjective judgment call. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

<figure>
  <img src="/images/notes/rlvr-scoring-example.png" alt="RLVR example: a prompt asking for the sum of primes less than 20, with a response boxing the final answer 77, verified by the check extracted_answer == 77 giving Reward = 1" />
  <figcaption>RLVR: scoring is a definitive check against the extracted answer. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

</div>

<figure>
  <img src="/images/notes/rlvr-code-scoring-example.png" alt="RLVR example for code generation: a prompt asking for a Python Fibonacci function, verified by unit tests (fib(0) == 0, fib(1) == 1, fib(10) == 55), all passing for Reward = 1" />
  <figcaption>RLVR for code generation: verification via unit tests. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

Unlike RLHF, there is no reward model to train, no reward model to overfit, and no proxy
misalignment to worry about. But this only works when correctness is cleanly verifiable: for
tasks where quality is subjective or multi-dimensional, you are back to needing a learned
reward.

As mentioned before, PPO was the original algorithm used in RLHF.

## Group Relative Policy Optimization (GRPO)

From a technical standpoint, it works perfectly fine to use PPO in the RL pipeline used to
develop reasoning models. However, DeepSeek-R1's RL pipeline instead used an algorithm called
Group Relative Policy Optimization (GRPO), introduced as a variant of Proximal Policy
Optimization (PPO) that improves mathematical reasoning ability while reducing PPO's memory
footprint.

GRPO shares a very similar surrogate loss to PPO, but avoids learning a value function, which
would otherwise require keeping another copy of the policy language model in memory just to
estimate value. GRPO says you don't need a learned critic or a learned reward model: sample a
group of responses, score them against a rule-based check, and use the spread as your training
signal. That is the whole algorithm.

GRPO does this by simplifying value estimation: instead of a learned value function, it assigns
the same baseline to every token in an episode, estimated via a Monte Carlo estimate over
multiple completions ($a_i$) and their rewards ($r_i$), sampled from the same initial
prompt/state ($s$).

The objective (or loss) is then:

$$
J(\theta) = \frac{1}{G}\sum_{i=1}^G \left(\min\left(\frac{\pi_\theta(a_i \mid s)}{\pi_{\theta_{\text{old}}}(a_i \mid s)}A_i, \text{clip}\left(\frac{\pi_\theta(a_i \mid s)}{\pi_{\theta_{\text{old}}}(a_i \mid s)}, 1-\varepsilon, 1+\varepsilon\right)A_i\right) - \beta\, \mathcal{D}_{\text{KL}}(\pi_\theta \Vert \pi_{\text{ref}})\right)
$$

To make an update meaningful, the advantage $A_i$ is computed by subtracting this baseline from
the reward. A positive advantage means the response was better than expected, so its probability
should increase; a negative advantage means it was worse than expected, so its probability
should decrease.

In PPO, the baseline comes from a learned value function. GRPO instead gets the baseline from
the group itself: given $G$ completions $a_1, \ldots, a_G$ sampled for the same prompt $s$ and
their rewards $r_1, \ldots, r_G$,

$$
\text{baseline} = \text{mean}(r_1, \ldots, r_G), \qquad A_i = \frac{r_i - \text{baseline}}{\text{std}(r_1, \ldots, r_G)}.
$$

Completions that score above the group average get a positive advantage and become more likely;
completions that score below average get a negative advantage and become less likely. The model
is always learning relative to itself, not some externally defined standard.

<style>
  .grpo-demo {
    --gd-good: #146c3f;
    --gd-good-bg: #e9f5ee;
    --gd-good-border: #a6d5ba;
    --gd-bad: #a32222;
    --gd-bad-bg: #fceaea;
    --gd-bad-border: #eab3b3;
    --gd-warn: #8a6412;
    --gd-warn-bg: #fdf4e3;
    --gd-warn-border: #e5c78d;
    --gd-panel: var(--surface);
    --gd-card: var(--bg);
    --gd-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin: 1.75rem 0;
  }
  :root[data-theme='dark'] .grpo-demo {
    --gd-good: #5fd39a;
    --gd-good-bg: #17301f;
    --gd-good-border: #2f6b4b;
    --gd-bad: #f0918f;
    --gd-bad-bg: #341d1d;
    --gd-bad-border: #6e3838;
    --gd-warn: #d9a93a;
    --gd-warn-bg: #332811;
    --gd-warn-border: #6b552a;
    --gd-panel: #15181d;
    --gd-card: var(--surface);
  }
  .grpo-panel {
    background: var(--gd-panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.85rem 1rem 1rem;
  }
  .grpo-step {
    margin: 0 0 0.7rem;
    font-size: 0.78rem;
    letter-spacing: 0.02em;
    color: var(--text-muted);
  }
  .grpo-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
  }
  .grpo-card {
    background: var(--gd-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.7rem 0.4rem;
    text-align: center;
  }
  .grpo-card.is-good { border-color: var(--gd-good-border); }
  .grpo-card.is-bad { border-color: var(--gd-bad-border); }
  .grpo-card.is-warn { border-color: var(--gd-warn-border); }
  .grpo-oid {
    font-family: var(--gd-mono);
    font-size: 0.72rem;
    color: var(--text-muted);
  }
  .grpo-ans {
    margin-top: 0.2rem;
    font-family: var(--gd-mono);
    font-size: 1rem;
    font-weight: 600;
    color: var(--heading);
  }
  .grpo-lab {
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  .grpo-score {
    font-family: var(--gd-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--heading);
  }
  .grpo-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0;
    color: var(--text-muted);
    font-size: 0.78rem;
  }
  .grpo-arrow i {
    display: block;
    width: 1px;
    height: 13px;
    background: currentColor;
    opacity: 0.45;
  }
  .grpo-arrow b {
    font-weight: 400;
    text-align: center;
  }
  .grpo-eq {
    background: var(--gd-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.8rem 0.6rem;
    text-align: center;
    font-family: var(--gd-mono);
    font-size: 0.95rem;
    color: var(--heading);
    overflow-x: auto;
  }
  .grpo-ask {
    background: var(--gd-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.8rem 0.7rem;
    text-align: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--heading);
  }
  .grpo-calc {
    font-family: var(--gd-mono);
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .grpo-adv {
    margin-top: 0.15rem;
    font-family: var(--gd-mono);
    font-size: 1.15rem;
    font-weight: 700;
  }
  .grpo-adv.is-up { color: var(--gd-good); }
  .grpo-adv.is-down { color: var(--gd-bad); }
  .grpo-adv.is-mild { color: var(--gd-warn); }
  .grpo-pill {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.72rem;
    white-space: nowrap;
  }
  .grpo-pill.is-up { background: var(--gd-good-bg); color: var(--gd-good); }
  .grpo-pill.is-down { background: var(--gd-bad-bg); color: var(--gd-bad); }
  .grpo-pill.is-mild { background: var(--gd-warn-bg); color: var(--gd-warn); }
  .grpo-final {
    background: var(--gd-good-bg);
    border: 1px solid var(--gd-good-border);
    border-radius: 8px;
    padding: 0.8rem 0.7rem;
    text-align: center;
    font-weight: 600;
    color: var(--heading);
  }
  .grpo-source {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  .grpo-controls {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.9rem;
  }
  .grpo-btn {
    padding: 0.28rem 0.9rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: 999px;
    font: inherit;
    font-size: 0.82rem;
    color: var(--text-muted);
    cursor: pointer;
  }
  .grpo-btn:hover,
  .grpo-btn:focus-visible {
    color: var(--link);
    border-color: var(--link);
  }
  /* Staged reveal. Base state is fully visible, so with no JS (which never adds
     .is-playing) the whole walkthrough still reads as a static diagram. */
  @keyframes grpo-in {
    from { opacity: 0; transform: translateY(7px); }
    to { opacity: 1; transform: none; }
  }
  .grpo-demo.is-playing .grpo-reveal {
    opacity: 0;
    animation: grpo-in 0.42s ease forwards;
    animation-delay: calc(var(--i) * 130ms);
  }
  @media (prefers-reduced-motion: reduce) {
    .grpo-demo.is-playing .grpo-reveal {
      opacity: 1;
      animation: none;
    }
  }
  @media (max-width: 640px) {
    .grpo-cards { grid-template-columns: repeat(2, 1fr); }
    .grpo-eq { font-size: 0.82rem; }
  }
</style>

<div class="grpo-demo" id="grpo-demo">
  <div class="grpo-panel grpo-reveal" style="--i: 0">
    <p class="grpo-step">prompt</p>
    <div class="grpo-ask">“What is 17 × 24?”</div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 1"><i></i><b>sample 4 answers</b><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-panel grpo-reveal" style="--i: 2">
    <p class="grpo-step">① score each answer</p>
    <div class="grpo-cards">
      <div class="grpo-card is-good grpo-reveal" style="--i: 3">
        <div class="grpo-oid">o₁</div>
        <div class="grpo-ans">408 ✓</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">1.0</div>
      </div>
      <div class="grpo-card is-bad grpo-reveal" style="--i: 4">
        <div class="grpo-oid">o₂</div>
        <div class="grpo-ans">391 ✗</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">0.0</div>
      </div>
      <div class="grpo-card is-good grpo-reveal" style="--i: 5">
        <div class="grpo-oid">o₃</div>
        <div class="grpo-ans">408 ✓</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">1.0</div>
      </div>
      <div class="grpo-card is-warn grpo-reveal" style="--i: 6">
        <div class="grpo-oid">o₄</div>
        <div class="grpo-ans">~400 ≈</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">0.5</div>
      </div>
    </div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 7"><i></i><b>average the scores</b><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-panel grpo-reveal" style="--i: 8">
    <p class="grpo-step">② group average</p>
    <div class="grpo-eq">(1.0 + 0.0 + 1.0 + 0.5) ÷ 4 = 0.625</div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 9"><i></i><b>advantage = score − average</b><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-panel grpo-reveal" style="--i: 10">
    <p class="grpo-step">③ who was above or below average?</p>
    <div class="grpo-cards">
      <div class="grpo-card grpo-reveal" style="--i: 11">
        <div class="grpo-calc">1.0 − 0.625</div>
        <div class="grpo-adv is-up">+0.38</div>
        <span class="grpo-pill is-up">reinforce ↑</span>
      </div>
      <div class="grpo-card grpo-reveal" style="--i: 12">
        <div class="grpo-calc">0.0 − 0.625</div>
        <div class="grpo-adv is-down">−0.63</div>
        <span class="grpo-pill is-down">suppress ↓</span>
      </div>
      <div class="grpo-card grpo-reveal" style="--i: 13">
        <div class="grpo-calc">1.0 − 0.625</div>
        <div class="grpo-adv is-up">+0.38</div>
        <span class="grpo-pill is-up">reinforce ↑</span>
      </div>
      <div class="grpo-card grpo-reveal" style="--i: 14">
        <div class="grpo-calc">0.5 − 0.625</div>
        <div class="grpo-adv is-mild">−0.13</div>
        <span class="grpo-pill is-mild">suppress ↓</span>
      </div>
    </div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 15"><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-final grpo-reveal" style="--i: 16">update weights: more of o₁, o₃ · less of o₂, o₄</div>
  <p class="grpo-source">Adapted from <a href="https://castform.com/learn/grpo-intro/">Castform's GRPO introduction</a>.</p>
  <div class="grpo-controls" hidden>
    <button type="button" class="grpo-btn grpo-replay">↺ replay</button>
  </div>
</div>

<script>
  (() => {
    const demo = document.getElementById('grpo-demo');
    if (!demo) return;
    const controls = demo.querySelector('.grpo-controls');
    const replayBtn = demo.querySelector('.grpo-replay');
    const play = () => {
      demo.classList.remove('is-playing');
      void demo.offsetWidth; // force reflow so the animations restart
      demo.classList.add('is-playing');
    };
    controls.hidden = false;
    replayBtn.addEventListener('click', play);
    // Play once when it first scrolls into view, rather than on load, so the
    // walkthrough isn't already over by the time the reader reaches it.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
          }
        }
      }, { threshold: 0.25 });
      io.observe(demo);
    } else {
      play();
    }
  })();
</script>

## TODO

1. Talk about token level vs sequence level ([video](https://www.youtube.com/watch?v=pW34NAiXmns)).
2. Refer to the Castform GRPO website.
3. [RLHF Book: Reasoning](https://rlhfbook.com/c/07-reasoning)
4. ["The State of LLM Reasoning Model Training"](https://magazine.sebastianraschka.com/p/the-state-of-llm-reasoning-model-training), Sebastian Raschka

[^rlvr]: See the RLHF Book's [discussion of RLVR](https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr).

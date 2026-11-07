---
title: Efficient LLMs
description: "How LoRA adapts large language models with small low-rank updates, and the matrix shapes and ranks behind it."
date: 2026-11-07
updated: 2026-11-07
bibliography:
  - id: lora
    authors: Edward J. Hu et al.
    title: "LoRA: Low-Rank Adaptation of Large Language Models"
    source: arXiv preprint
    year: 2021
    url: https://arxiv.org/abs/2106.09685
---

## LoRA (Low-Rank Adaptation)

In simple words, this is the method where a large language model learns a new task by training a small update instead of rewriting all its weights. [[1]](#ref-lora)

The difficulty of [fine-tuning](/notes/instruction-finetuning/) an entire model is scale. Full fine-tuning stores the combined result as another complete set of weights. Updating every parameter of a large model requires substantial training memory, and each finished task produces another full-sized set of weights to store and deploy.

LoRA was developed to make this adaptation smaller: preserve the pretrained model, then learn only the compact changes required by the new task. It keeps the original matrix fixed and learns only the change using a much smaller representation.

<figure class="narrow" style="max-width: min(24rem, 100%); margin-inline: auto;">
  <img src="/images/notes/lora-low-rank-update.svg" width="360" alt="LoRA diagram showing an input x passing through a frozen pretrained weight matrix and a parallel path through trainable matrices A and B, whose outputs are added." style="background: white;" />
  <figcaption>A low-rank update runs alongside the frozen weight matrix. Only A and B are trained. Source: <a href="https://arxiv.org/html/2106.09685v2#S1.F1">Hu et al., Figure 1</a>.</figcaption>
</figure>

It fine-tunes an LLM without changing its original weights. For each chosen weight matrix, it learns a small update written as the product of two thin matrices, $B$ and $A$, with a low rank $r$. Only those two matrices are trained for each task. So whenever something new needs to be learned, it comes as a small adapter instead of requiring a full copy of the model to be trained.

Full fine-tuning allows updates to flow into every model weight. This gives training broad freedom, but it also requires gradients and optimizer state for the full model and produces another full-sized set of weights for the task.

LoRA changes only the destination of the update. The same examples, loss, and backpropagation are used, but the pretrained weights are marked as frozen. Gradients update the small LoRA parameters instead, so the task is stored as an adapter rather than another copy of the model.

### Transformer Layers LoRA Can Change

A transformer carries each token as a list of learned features called a hidden state. Linear layers appear throughout every transformer block, especially inside attention and the feed-forward network. They transform those features using weight matrices.

LoRA can be attached to selected projections in attention, the feed-forward network, or both. It adds a parallel weight update to those linear layers. The surrounding attention calculation, activation functions, normalization, and residual path remain unchanged.

<figure class="narrow" style="max-width: min(30rem, 100%); margin-inline: auto;">
  <img src="/images/notes/lora-transformer-layer.png" width="480" alt="Transformer layer with query, key, and value projections, and a zoomed-in LoRA update path showing the trainable low-rank matrices in magenta alongside a frozen weight matrix." style="background: white;" />
  <figcaption>LoRA applied to attention projections, illustrated by the Q, K, and V matrices. The trainable low-rank matrices are shown in magenta. Source: <a href="https://adapterhub.ml/blog/2022/09/updates-in-adapter-transformers-v3-1/">Clifton Poth, AdapterHub, Figure 2</a>.</figcaption>
</figure>

<figure class="narrow" style="max-width: min(28rem, 100%); margin-inline: auto;">
  <img src="/images/notes/lora-operational-schematic.png" width="448" alt="Transformer block showing multi-head attention, residual connections, normalization, and a feed-forward network with a LoRA adapter. The adapter combines pretrained weights W with a low-rank path through W A and W B." style="background: white;" />
  <figcaption>LoRA applied to a feed-forward projection, illustrating another possible location for the same low-rank update. Here <i>W</i><sub>A</sub> and <i>W</i><sub>B</sub> correspond to A and B above. Source: <a href="https://www.researchgate.net/figure/Operational-schematic-of-LoRa-adapters-within-the-transformer_fig2_378253001">Ammar et al., Figure 2</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).</figcaption>
</figure>

### How LoRA Computes an Update

LoRA doesn't replace what the pretrained model already knows. It learns a small correction to the model's existing behaviour.

Imagine a pretrained model has a weight matrix $W$. When a linear layer receives a hidden state $x$, a vector containing information about the input, it computes:

$$
y = Wx
$$

- $x$: input hidden state
- $W$: pretrained weight matrix
- $y$: output of the linear layer

Instead of changing $W$, LoRA keeps it frozen and trains two smaller matrices, $A$ and $B$.

<figure class="narrow">
  <svg viewBox="0 0 620 330" role="img" aria-labelledby="lora-correction-title lora-correction-desc" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit; color: var(--text);">
    <title id="lora-correction-title">LoRA adds a learned correction to the original result</title>
    <desc id="lora-correction-desc">The same hidden state x goes through the frozen pretrained matrix W and the trainable LoRA update BA in parallel. Their outputs Wx and BAx are added to produce y.</desc>
    <defs><marker id="lora-correction-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--text-muted);" /></marker></defs>
    <g fill="none" stroke-width="2" style="stroke: var(--text-muted);">
      <path d="M 130 165 H 168 V 82 H 210" marker-end="url(#lora-correction-arrow)" />
      <path d="M 168 165 V 248 H 210" marker-end="url(#lora-correction-arrow)" />
      <path d="M 420 82 H 510 V 141" marker-end="url(#lora-correction-arrow)" />
      <path d="M 420 248 H 510 V 189" marker-end="url(#lora-correction-arrow)" />
      <path d="M 534 165 H 582" marker-end="url(#lora-correction-arrow)" />
    </g>
    <rect x="10" y="127" width="120" height="76" rx="12" stroke-width="2" style="fill: var(--surface); stroke: var(--border);" />
    <rect x="210" y="43" width="210" height="78" rx="12" stroke-width="2" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="210" y="209" width="210" height="78" rx="12" stroke-width="2" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <circle cx="510" cy="165" r="24" stroke-width="2" style="fill: var(--bg); stroke: var(--text-muted);" />
    <g text-anchor="middle" style="fill: var(--heading); font-size: 18px;">
      <text x="70" y="159">Hidden state</text><text x="70" y="184" font-style="italic">x</text>
      <text x="315" y="75" font-weight="600">Pretrained W</text><text x="315" y="101">Frozen</text>
      <text x="315" y="241" font-weight="600">LoRA: BA</text><text x="315" y="267">Trainable</text>
      <text x="510" y="173" font-size="28">+</text><text x="600" y="171" font-style="italic">y</text>
      <text x="315" y="26" style="fill: var(--text-muted); font-size: 16px;">Original result</text>
      <text x="315" y="315" style="fill: var(--text-muted); font-size: 16px;">Learned correction</text>
      <text x="465" y="69" font-style="italic">Wx</text><text x="465" y="273" font-style="italic">BAx</text>
    </g>
  </svg>
  <figcaption>The same input goes through two paths, and their results are added together. Only the LoRA matrices A and B are trained.</figcaption>
</figure>

The first reduces the hidden state to a narrow intermediate width $r$. The second restores the original output width.

<figure class="narrow">
  <svg viewBox="0 0 570 260" role="img" aria-labelledby="lora-width-title lora-width-desc" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
    <title id="lora-width-title">A reduces the width; B restores the output width</title>
    <desc id="lora-width-desc">The input hidden state x has width d in. The trainable matrix A maps it to Ax of width r. The trainable matrix B maps Ax to the correction BAx of width d out.</desc>
    <defs><marker id="lora-width-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--text-muted);" /></marker></defs>
    <g stroke-width="2">
      <rect x="20" y="65" width="40" height="140" rx="6" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
      <path d="M 90 65 L 225 115 V 155 L 90 205 Z" style="fill: var(--diagram-purple); stroke: var(--diagram-purple-border);" />
      <rect x="260" y="115" width="40" height="40" rx="6" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
      <path d="M 335 115 L 470 65 V 205 L 335 155 Z" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
      <rect x="505" y="65" width="40" height="140" rx="6" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    </g>
    <g fill="none" stroke-width="2" marker-end="url(#lora-width-arrow)" style="stroke: var(--text-muted);">
      <path d="M 63 135 H 85" /><path d="M 228 135 H 255" />
      <path d="M 303 135 H 330" /><path d="M 473 135 H 500" />
    </g>
    <g text-anchor="middle" style="fill: var(--heading); font-size: 19px;">
      <text x="40" y="44" font-style="italic">x</text>
      <text x="155" y="143" font-size="26" font-style="italic">A</text>
      <text x="280" y="95" font-style="italic">Ax</text>
      <text x="405" y="143" font-size="26" font-style="italic">B</text>
      <text x="525" y="44" font-style="italic">BAx</text>
      <text x="40" y="237">d<tspan baseline-shift="sub" font-size="13">in</tspan></text>
      <text x="155" y="237" style="fill: var(--text-muted); font-size: 17px;">Reduce</text>
      <text x="280" y="237" font-style="italic">r</text>
      <text x="405" y="237" style="fill: var(--text-muted); font-size: 17px;">Expand</text>
      <text x="525" y="237">d<tspan baseline-shift="sub" font-size="13">out</tspan></text>
    </g>
  </svg>
  <figcaption>The LoRA path narrows from the input width to r through A, then expands to the output width through B. Both matrices are trainable.</figcaption>
</figure>

The new calculation becomes:

$$
\boxed{y = Wx + BAx}
$$

1. $Wx$: what the pretrained model would normally output.
2. $BAx$: the correction learned by LoRA.
3. $y$: the final, adapted output.

A LoRA adapter is therefore not a second language model. It is the collection of these small update matrices across the selected layers. Several adapters can share the same frozen base model because each stores only its own corrections.

### Matrix Rank and LoRA

A matrix is a rectangular table of numbers. Its shape tells us how many input features it receives and how many output features it produces. A weight matrix with shape $d_{\text{out}} \times d_{\text{in}}$ maps a hidden state with $d_{\text{in}}$ features to one with $d_{\text{out}}$ features.[^matrix-shape]

The rank of a matrix describes how many independent directions its transformation can express. A full-rank matrix can use every available direction. A low-rank matrix is more restricted because some rows or columns can be produced from combinations of others.

<figure class="narrow">
  <img src="/images/notes/matrix-rank-transformations.png" width="544" alt="Three 2-by-2 matrices transform a square into a parallelogram for rank 2, a line for rank 1, and a point for rank 0. The matrices are [3, 1; 1, 2], [1, 1; 2, 2], and the zero matrix." style="background: white;" />
  <figcaption>

1. **Rank 2 (full rank):** A 2D square becomes a parallelogram, preserving two independent directions.
2. **Rank 1 (low rank):** The square collapses onto a line, leaving just one independent direction.
3. **Rank 0:** Everything collapses into a single point, leaving zero independent directions.[^matrix-rank]

Source: <a href="https://advaitha.github.io/myDataScienceJourney/linear_algebra/05_determinants.html">My Datascience Journey, Determinants</a>.

  </figcaption>
</figure>

The product $BA$ below has the same outer shape as the pretrained weight matrix $W$, so it can be added to that weight. Its rank cannot exceed the inner dimension $r$. This is the bottleneck: the update $BA$ has at most $r$ independent output directions.

Multiplication by $B$ can expand the number of coordinates, but it cannot recreate independent directions lost when passing through the narrow $r$-dimensional bottleneck. This is the mathematical reason two smaller matrices form a low-rank update.

<figure class="narrow">
  <svg viewBox="0 0 620 420" role="img" aria-labelledby="lora-shapes-title lora-shapes-desc" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
    <title id="lora-shapes-title">LoRA stores a full-shaped update as two smaller matrices</title>
    <desc id="lora-shapes-desc">A standard linear projection maps x of width d in through W of shape d out by d in to y of width d out. LoRA represents its update as B of shape d out by r times A of shape r by d in. Their product BA has the same shape as W, but rank at most r.</desc>
    <text x="310" y="25" text-anchor="middle" style="fill: var(--heading); font-size: 20px;">A standard linear projection</text>
    <text x="100" y="60" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">x</text>
    <text x="310" y="60" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">W</text>
    <text x="520" y="60" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">y</text>
    <rect x="90" y="78" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="90" y="102" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="90" y="126" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="90" y="150" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="265" y="78" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="289" y="78" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="313" y="78" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="337" y="78" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="265" y="102" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="289" y="102" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="313" y="102" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="337" y="102" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="265" y="126" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="289" y="126" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="313" y="126" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="337" y="126" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="265" y="150" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="289" y="150" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="313" y="150" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="337" y="150" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="510" y="78" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="510" y="102" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="510" y="126" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect x="510" y="150" width="19" height="19" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <text x="190" y="135" text-anchor="middle" style="fill: var(--heading); font-size: 26px;">→</text>
    <text x="425" y="135" text-anchor="middle" style="fill: var(--heading); font-size: 26px;">→</text>
    <text x="100" y="199" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">d<tspan baseline-shift="sub" font-size="12">in</tspan></text>
    <text x="310" y="199" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">d<tspan baseline-shift="sub" font-size="12">out</tspan> × d<tspan baseline-shift="sub" font-size="12">in</tspan></text>
    <text x="520" y="199" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">d<tspan baseline-shift="sub" font-size="12">out</tspan></text>
    <path d="M 18 220 H 602" style="stroke: var(--border);" />
    <text x="310" y="250" text-anchor="middle" style="fill: var(--heading); font-size: 20px;">LoRA stores the update as two factors</text>
    <text x="74" y="282" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">B</text>
    <text x="233" y="282" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">A</text>
    <text x="430" y="282" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">ΔW = BA</text>
    <rect x="53" y="295" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="77" y="295" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="53" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="77" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="53" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="77" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="53" y="367" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="77" y="367" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="188" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="212" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="236" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="260" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="188" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="212" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="236" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="260" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect x="385" y="295" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="409" y="295" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="433" y="295" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="457" y="295" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="385" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="409" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="433" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="457" y="319" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="385" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="409" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="433" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="457" y="343" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="385" y="367" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="409" y="367" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="433" y="367" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <rect x="457" y="367" width="19" height="19" rx="4" style="fill: var(--diagram-orange); stroke: var(--diagram-orange-border);" />
    <text x="145" y="350" text-anchor="middle" style="fill: var(--heading); font-size: 26px;">×</text>
    <text x="335" y="350" text-anchor="middle" style="fill: var(--heading); font-size: 26px;">=</text>
    <text x="550" y="346" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">rank ≤ r</text>
    <text x="74" y="402" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">d<tspan baseline-shift="sub" font-size="12">out</tspan> × r</text>
    <text x="233" y="402" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">r × d<tspan baseline-shift="sub" font-size="12">in</tspan></text>
    <text x="430" y="402" text-anchor="middle" style="fill: var(--heading); font-size: 18px;">d<tspan baseline-shift="sub" font-size="12">out</tspan> × d<tspan baseline-shift="sub" font-size="12">in</tspan></text>
  </svg>
  <figcaption>B and A share the inner dimension r. Their product has the same outer shape as W, with rank at most r. The cells illustrate shapes rather than specific parameter values.</figcaption>
</figure>

Consider a linear layer with 4,096 input features and 4,096 output features. A freely trainable update would contain $4{,}096 \times 4{,}096 = 16{,}777{,}216$ parameters. LoRA sends the update through a much narrower space instead.

With $r = 8$, the two adapter matrices contain only 65,536 parameters for this layer:

| Update | Trainable parameters |
| --- | --- |
| Full update matrix | $4{,}096 \times 4{,}096 = 16{,}777{,}216$ |
| LoRA matrices $A$ and $B$ | $(8 \times 4{,}096) + (4{,}096 \times 8) = 65{,}536$ |

That is $65{,}536 / 16{,}777{,}216 \times 100 = 0.390625\%$, or about **0.39% as many trainable parameters** as a full update matrix. The frozen base weights are still present; these counts compare the parameters trained for this layer.

<figure class="lora-rank-figure">
<div class="lora-rank-demo" id="lora-rank-demo">
  <div class="lora-rank-controls" hidden>
    <label for="lora-projection">Projection
      <select id="lora-projection">
        <option value="attention">Attention: 4,096 → 4,096</option>
        <option value="expand">FFN expansion: 4,096 → 11,008</option>
        <option value="reduce">FFN reduction: 11,008 → 4,096</option>
      </select>
    </label>
    <label for="lora-rank">Rank r = <output id="lora-rank-value" for="lora-rank">8</output>
      <input id="lora-rank" type="range" min="1" max="128" value="8" step="1" />
    </label>
  </div>
  <svg viewBox="0 0 600 240" role="img" aria-labelledby="lora-rank-demo-title lora-rank-demo-desc" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
    <title id="lora-rank-demo-title">Full update matrix compared with LoRA's factors</title>
    <desc id="lora-rank-demo-desc">At rank 8, a 4096 by 4096 full update has 16777216 parameters. LoRA uses A of shape 8 by 4096 and B of shape 4096 by 8, with 65536 parameters in total.</desc>
    <g text-anchor="middle" style="fill: var(--heading); font-size: 18px;">
      <text x="110" y="25">Full update</text><text x="340" y="25">A</text><text x="500" y="25">B</text>
    </g>
    <rect id="lora-full-shape" x="50" y="50" width="120" height="120" rx="4" style="fill: var(--diagram-blue); stroke: var(--diagram-blue-border);" />
    <rect id="lora-a-shape" x="280" y="105" width="120" height="10" rx="3" style="fill: var(--diagram-green); stroke: var(--diagram-green-border);" />
    <rect id="lora-b-shape" x="495" y="50" width="10" height="120" rx="3" style="fill: var(--diagram-purple); stroke: var(--diagram-purple-border);" />
    <g text-anchor="middle" style="fill: var(--text-muted); font-size: 16px;">
      <text x="225" y="115">versus</text><text x="435" y="115" font-size="24">+</text>
      <text id="lora-full-dims" x="110" y="203">4,096 × 4,096</text>
      <text id="lora-a-dims" x="340" y="203">8 × 4,096</text>
      <text id="lora-b-dims" x="500" y="203">4,096 × 8</text>
      <text x="300" y="235" font-size="14">Schematic shapes, not drawn to scale.</text>
    </g>
  </svg>
  <dl class="lora-rank-totals">
    <div><dt>Full update parameters</dt><dd id="lora-full-count">16,777,216</dd></div>
    <div><dt>LoRA parameters (A + B)</dt><dd id="lora-adapter-count">65,536</dd></div>
  </dl>
  <p class="lora-rank-summary" id="lora-rank-summary" aria-live="polite" aria-atomic="true">At rank 8, LoRA trains 0.391% as many parameters as the full update, or 256× fewer.</p>
  <p class="lora-rank-formula">Full update: d<sub>out</sub> × d<sub>in</sub>. LoRA: r × (d<sub>in</sub> + d<sub>out</sub>).</p>
</div>
  <figcaption>Choose a projection and change the rank to compare a full update with LoRA's two matrices. These are illustrative layer sizes. Each calculation covers one weight matrix, not an entire Transformer block or model.</figcaption>
</figure>

Visualization inspired by <a href="https://www.tensortonic.com/llm-internals/lora">TensorTonic's LoRA rank comparison</a>.

<style>
  .lora-rank-figure { max-width: 40rem; margin-inline: auto; }
  .lora-rank-figure .lora-rank-demo { margin-bottom: 0; }
  .lora-rank-demo { margin: 1.5rem auto; max-width: 40rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: 8px; }
  .lora-rank-controls { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.25rem; margin-bottom: 1rem; }
  .lora-rank-controls[hidden] { display: none; }
  .lora-rank-controls label { display: flex; flex-wrap: wrap; gap: 0.3rem; align-content: start; font-size: 0.9rem; }
  .lora-rank-controls select, .lora-rank-controls input { width: 100%; min-width: 0; font: inherit; accent-color: var(--link); }
  .lora-rank-controls select { margin-top: 0.2rem; padding: 0.45rem; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 4px; }
  .lora-rank-controls input { margin: 0.7rem 0 0; }
  .lora-rank-controls :focus-visible { outline: 2px solid var(--link); outline-offset: 3px; }
  .lora-rank-demo svg { display: block; width: 100%; height: auto; }
  .lora-rank-totals { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.8rem 0; }
  .lora-rank-totals dt { color: var(--text-muted); font-size: 0.85rem; }
  .lora-rank-totals dd { margin: 0.2rem 0 0; color: var(--heading); font-size: 1.25rem; font-variant-numeric: tabular-nums; }
  .lora-rank-demo .lora-rank-summary { margin: 1rem 0 0; }
  .lora-rank-demo .lora-rank-formula { margin: 0.6rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
  @media (max-width: 540px) { .lora-rank-controls, .lora-rank-totals { grid-template-columns: 1fr; } .lora-rank-demo { padding: 0.8rem; } }
</style>

<script>
  (() => {
    const demo = document.getElementById('lora-rank-demo');
    if (!demo) return;
    const projection = demo.querySelector('#lora-projection');
    const slider = demo.querySelector('#lora-rank');
    const layers = { attention: [4096, 4096], expand: [4096, 11008], reduce: [11008, 4096] };
    const format = new Intl.NumberFormat('en-US');
    const set = (id, text) => { demo.querySelector('#' + id).textContent = text; };
    const update = () => {
      const [input, output] = layers[projection.value];
      const rank = Number(slider.value);
      const full = input * output;
      const adapter = rank * (input + output);
      set('lora-rank-value', rank);
      set('lora-full-dims', `${format.format(output)} × ${format.format(input)}`);
      set('lora-a-dims', `${rank} × ${format.format(input)}`);
      set('lora-b-dims', `${format.format(output)} × ${rank}`);
      set('lora-full-count', format.format(full));
      set('lora-adapter-count', format.format(adapter));
      set('lora-rank-summary', `At rank ${rank}, LoRA trains ${(100 * adapter / full).toFixed(3)}% as many parameters as the full update, or ${format.format(Math.round(full / adapter))}× fewer.`);
      set('lora-rank-demo-desc', `Input width ${input}, output width ${output}, rank ${rank}. The full update has ${full} parameters. A has shape ${rank} by ${input} and B has shape ${output} by ${rank}, with ${adapter} parameters in total.`);
      const scale = 120 / Math.max(input, output);
      const inputWidth = input * scale;
      const outputHeight = output * scale;
      const thickness = 6 + rank / 128 * 36;
      const shape = (id, x, y, width, height) => {
        const rect = demo.querySelector('#' + id);
        for (const [key, value] of Object.entries({ x, y, width, height })) rect.setAttribute(key, value);
      };
      shape('lora-full-shape', 110 - inputWidth / 2, 110 - outputHeight / 2, inputWidth, outputHeight);
      shape('lora-a-shape', 340 - inputWidth / 2, 110 - thickness / 2, inputWidth, thickness);
      shape('lora-b-shape', 500 - thickness / 2, 110 - outputHeight / 2, thickness, outputHeight);
    };
    projection.addEventListener('change', update);
    slider.addEventListener('input', update);
    update();
    demo.querySelector('.lora-rank-controls').hidden = false;
  })();
</script>

[^matrix-rank]: The numbers in the blue $2 \times 2$ grids at the top are the entries of the matrices that control how the shapes below are transformed.

    Each matrix takes a point $(x,y)$ and produces a new point $(x',y')$.

    #### 1. Rank 2: Full rank

    $$
    A = \begin{bmatrix} 3 & 1 \\ 1 & 2 \end{bmatrix}
    $$

    The numbers tell us:

    $$
    x' = 3x + y
    $$

    $$
    y' = x + 2y
    $$

    The two columns, $(3,1)$ and $(1,2)$, represent two independent directions. That's why the square becomes a parallelogram rather than collapsing.

    #### 2. Rank 1: Low rank

    $$
    A = \begin{bmatrix} 1 & 1 \\ 2 & 2 \end{bmatrix}
    $$

    Notice that both columns are identical!

    $$
    x' = x + y, \qquad y' = 2x + 2y
    $$

    Because $y' = 2x'$, every output point lies on the same line.

    That's why the square collapses into a line.

    #### 3. Rank 0: Zero rank

    $$
    A = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix}
    $$

    Every input becomes:

    $$
    (x',y') = (0,0)
    $$

    The entire square collapses into a single point.

    The key idea: The numbers determine how the transformation moves points. The rank tells us how many independent output directions remain.

[^matrix-shape]: A weight matrix transforms a list of numbers from one size into a list of numbers of another size. Suppose $d_{\text{in}} = 3$ and $d_{\text{out}} = 2$. The input has three features, and the output has two. The weight matrix has two rows and three columns:

    $$
    W =
    \begin{bmatrix}
    1 & 2 & 3 \\
    4 & 5 & 6
    \end{bmatrix},
    \qquad
    x =
    \begin{bmatrix}
    10 \\
    20 \\
    30
    \end{bmatrix}.
    $$

    Each row of $W$ produces one output feature:

    | Output feature | Calculation | Result |
    | --- | --- | --- |
    | First | $1(10) + 2(20) + 3(30)$ | $140$ |
    | Second | $4(10) + 5(20) + 6(30)$ | $320$ |

    So the product is:

    $$
    Wx =
    \begin{bmatrix}
    140 \\
    320
    \end{bmatrix}.
    $$

    Three input numbers become two output numbers.

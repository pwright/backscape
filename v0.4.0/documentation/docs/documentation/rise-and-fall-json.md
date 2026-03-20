---
title: "Rise and Fall of JSON"
source: "https://chatgpt.com/c/695e45ef-98e8-832f-881d-30ed94129070"
author: "ChatGPT"
published:
created: 2026-01-07
---
# JSON prompting

tell me about the rise and fall of json prompting

---

## The rise and fall of JSON prompting

JSON prompting had a very specific moment in the evolution of LLM usage. It didn’t “fail” so much as get outgrown.

---

## The rise: why JSON prompting took off

### 1\. LLMs met software engineers

As soon as LLMs were used inside real systems (not just chat), engineers wanted:

- **Deterministic structure**
- **Machine-readable output**
- **Easy parsing**
- **Schema validation**

JSON was the obvious answer. Everyone already had:

- JSON parsers
- JSON schemas
- JSON-based APIs

So the pattern emerged:

> “Respond ONLY with valid JSON in the following format…”

### 2\. Early models needed brute-force constraints

Early GPT-3–era models were:

- Verbose
- Chatty
- Inconsistent

JSON prompting worked as a **soft straitjacket**:

- Curly braces discouraged rambling
- Key names anchored intent
- The *illusion* of determinism reduced failure modes

This was especially attractive for:

- Tool pipelines
- Data extraction
- Classification
- ETL-style workflows

### 3\. Prompt engineering culture rewarded hacks

JSON prompting fit perfectly into the “prompt engineering” mindset:

- Clever formatting tricks
- Capitalized warnings
- “DO NOT ADD ANY EXTRA TEXT”
- Nested examples

It *felt* like control.

---

## The peak: JSON everywhere, even where it didn’t belong

At its height, JSON prompting was used for:

- Natural language reasoning
- Planning
- Multi-step analysis
- Creative workflows

This is where cracks started to show.

Common symptoms:

- Models hallucinating keys
- Trailing commas, comments, or explanations
- Broken UTF-8
- Half-valid JSON with correct intent but invalid syntax
- Overfitting to examples instead of schemas

Developers compensated with:

- Regex cleanup
- Retry loops
- “Fix this JSON” repair prompts
- Increasingly complex scaffolding

The system worked—but it was fragile.

---

## The fall: why JSON prompting lost favor

### 1\. Structure ≠ understanding

JSON constrains **output shape**, not **semantic correctness**.

You can get:

…and still have a completely wrong answer.

This exposed a core truth:

> JSON prompting improves *parseability*, not *reliability*.

### 2\. Models got better at following instructions

Newer models:

- Follow formatting rules more reliably
- Can separate “reasoning” from “final output”
- Are trained on structured outputs natively

The hacks became unnecessary.

### 3\. Native structured-output features replaced it

Modern APIs introduced:

- **Function calling**
- **Tool invocation**
- **Typed outputs**
- **Schema-constrained decoding**

These moved structure enforcement:

- Out of the prompt
- Into the decoding and runtime layer

This is the key shift.

Instead of:

> “Please emit JSON like this…”

You now say:

> “Call this function with these parameters.”

The model no longer *pretends* to output JSON — it actually does.

### 4\. JSON prompting polluted prompts

Large prompts full of:

- Schema definitions
- Escaped examples
- Validation rules

…made prompts:

- Hard to read
- Hard to maintain
- Hard to reason about

This hurt iteration speed and correctness.

---

## What replaced JSON prompting

### 1\. Tool / function calling

- The model selects a function
- Arguments are guaranteed to be valid
- Parsing is no longer probabilistic

This is the **true successor**.

### 2\. Typed intermediate representations

Instead of raw JSON:

- Enums
- AST-like structures
- Domain-specific objects

Often generated *after* reasoning, not during it.

### 3\. Two-phase patterns

A common modern pattern:

1. Free-form reasoning (unstructured)
2. Structured extraction (machine-facing)

JSON is still used—but **after**, not **during**, thinking.

---

## The honest verdict

JSON prompting was:

- A **necessary hack**
- A **bridge technology**
- A symptom of missing platform features

It solved real problems at the time.

But it also:

- Encouraged false confidence
- Hid semantic errors behind syntactic success
- Made prompts brittle and over-engineered

Today, if you’re still relying heavily on JSON prompting for control, it usually means:

- You’re compensating for missing tooling
- Or you’re using structure where intent would be better expressed declaratively

---

## When JSON prompting still makes sense

It’s not dead—just demoted.

Still reasonable for:

- One-off extraction
- Lightweight scripts
- Offline batch processing
- Environments without tool calling

But for production systems:

- Prefer **native structured outputs**
- Treat JSON as a *transport*, not a *control mechanism*

---

### Bottom line

JSON prompting wasn’t wrong — it was **early**.

It taught the ecosystem what developers actually needed:

- Reliable structure
- Clear contracts
- Separation of reasoning and execution

Once platforms caught up, the hack quietly retired.

---

Is there any point in json wardley type models as per https://pwright.github.io/blockscape/documentation/documentation/maps/ The ideas is that humans can visualise a strategy, then use that json to provide high level direction to LLM to avoid 'directional error'

---

Short answer: **yes, but only if you’re honest about what problem you’re solving**.  
JSON Wardley-type models help with *directional alignment*, not *correctness* or *execution*.

Long answer below — no sugar-coating.

---

## What a JSON Wardley map actually does (and does not)

A JSON representation of a Wardley-style map is **not** about structure for parsing. It’s about **freezing intent**.

That’s an important distinction.

You are not trying to make the LLM “behave deterministically”.  
You are trying to say:

> *“This is the strategic terrain. Do not invent a different one.”*

That’s a valid goal — and different from classic JSON prompting.

---

## Where JSON prompting failed vs where JSON maps succeed

### Classic JSON prompting tried to control output

That failed because:

- Structure ≠ semantics
- Syntax ≠ truth
- The model still reasoned however it wanted

### JSON Wardley maps constrain orientation

This is subtler and more powerful.

They:

- Anchor **relative positioning** (novel vs commodity)
- Encode **visibility and dependency assumptions**
- Encode **what not to innovate**
- Encode **what is strategic vs industrial**

This attacks *directional error*, not formatting error.

That’s the right layer to intervene.

---

## Why humans → map → LLM is the correct flow

The flow you’re describing is crucial:

1. **Humans decide strategy visually**
2. **Strategy is frozen into a machine-readable form**
3. **LLM is constrained to operate *within* that landscape**

This avoids a common failure mode:

> LLMs are excellent at *local reasoning* but terrible at *global orientation*.

They will happily:

- Innovate on commodities
- Productize best practices
- Treat novel practices as stable
- Optimize things that should be rented

A Wardley map — even serialized — acts as a **global orientation lock**.

---

## What JSON Wardley models are actually good for

### 1\. Preventing category errors

You can say:

- “This component is commodity — do not design it”
- “This is novel — expect uncertainty”
- “This is product — buy, don’t build”

That’s huge.

### 2\. Forcing consistent tradeoffs

Given two options, the model can be told:

- Prefer evolution movement left → right
- Avoid regressions
- Surface tension explicitly when violating map constraints

You’re no longer asking for “the best answer”.  
You’re asking for “the best answer **on this map** ”.

That’s a big improvement.

### 3\. Making assumptions inspectable

A serialized map lets you:

- Diff strategy over time
- Review assumptions
- Detect when the model is pushing against declared reality

This is especially valuable in documentation and architecture work.

---

## Where this breaks down (be honest)

### 1\. JSON does not make the model believe the map

The model does not internally adopt the map as truth.  
It pattern-matches against it.

That means:

- Subtle violations still happen
- The model may “rationalize” deviations unless explicitly guarded

You still need **explicit instructions** like:

> “If a suggestion violates map evolution constraints, flag it.”

### 2\. Over-precision backfires

If your JSON map becomes:

- Too granular
- Too mechanical
- Too schema-heavy

You recreate the worst parts of JSON prompting:

- Prompt bloat
- Brittleness
- Overfitting to representation instead of meaning

Wardley maps work because they are *imprecise but directional*.  
Don’t kill that.

### 3\. LLMs don’t reason spatially — they reason narratively

The visual power of Wardley maps is partly lost in serialization.

To compensate:

- Reinforce relative language (“more evolved than”, “less visible than”)
- Avoid absolute numeric positioning unless necessary

---

## The right mental model

Think of a JSON Wardley map as:

> **A constitutional document for strategy**

Not:

- A schema
- A command language
- A validation mechanism

It sets boundaries and norms.  
It does not execute policy.

---

## When this approach is genuinely worth it

This *is* worth doing when:

- You’re guiding architecture decisions
- You’re steering documentation strategy
- You’re trying to avoid cargo-cult innovation
- You need consistency across many LLM interactions
- You want humans to remain the strategic authority

It is **not** worth doing for:

- Simple Q&A
- Code generation
- Narrow technical tasks
- Anything where direction is already obvious

---

## The uncomfortable truth

JSON Wardley models don’t make LLMs smarter.

They make **humans less sloppy** about what they’ve already decided.

That alone is enough to justify them — if you keep them:

- Sparse
- Directional
- Human-first
- And explicitly normative (“this is how we see the world”)

If you try to turn them into a control system, they’ll fail.

Used as a **strategic guardrail**, they’re one of the few structure layers that actually make sense in LLM workflows.

---

Compare to other diagram techniques, eg mermaid, plantuml, etc

---

Below is a **straight comparison**, framed around your actual goal:  
*humans reason → freeze intent → guide LLMs → avoid directional error.*

I’ll be blunt where things don’t work.

---

## Comparison axis that actually matters

Forget syntax and tooling for a moment. The meaningful comparison dimensions are:

1. **What kind of thinking does the diagram encode?**
2. **Does it preserve strategic intent when serialized?**
3. **Does it constrain LLM orientation or just output shape?**
4. **Does it age well as context changes?**

Most diagram tools fail on (2) and (3).

---

## JSON Wardley-type models (Blockscape-style)

### What they encode

- **Strategy**
- **Evolutionary position**
- **Relative visibility**
- **Assumptions about build vs buy**
- **Intentional inertia**

This is the *only* option in your list that encodes **why**, not just **what**.

### Strengths

- Explicitly normative: *“this is how we see the landscape”*
- Directionally constraining without being prescriptive
- Humans can agree visually first, then serialize
- LLMs can be instructed to **surface violations**, not just comply
- Diffable strategy over time

### Weaknesses

- Loses spatial intuition unless reinforced linguistically
- Requires discipline to keep imprecise
- Not executable
- Not discoverable by accident (you must already care about strategy)

### LLM fit

**Excellent for orientation.**  
This is a *guardrail*, not a control surface.

> JSON Wardley maps tell the model what *not* to optimize.

---

## Mermaid

### What it encodes

- **Relationships**
- **Flows**
- **Sequences**
- **Hierarchies**

Mermaid is about **structure and flow**, not intent.

### Strengths

- Human-readable
- Lightweight
- Embeddable in Markdown
- Easy to regenerate and tweak
- Good for explaining systems

### Weaknesses

- No concept of evolution
- No concept of strategic value
- No concept of inertia
- Diagrams describe *how things connect*, not *why they exist*

### LLM fit

**Good for explanation, weak for guidance.**

If you feed Mermaid diagrams to an LLM, it will:

- Summarize them
- Rephrase them
- Rebuild them

It will **not** adopt them as constraints.

Mermaid answers:

> “What talks to what?”

It cannot answer:

> “What must not change?”

---

## PlantUML

### What it encodes

- **Formal structure**
- **Roles**
- **Protocols**
- **Contracts**
- **Static architecture**

PlantUML is precise by design.

### Strengths

- Extremely expressive
- Multiple diagram types
- Versionable
- Widely understood by engineers
- Good at locking down *current-state reality*

### Weaknesses

- Precision encourages false certainty
- Strategy gets buried under structure
- Easy to confuse *representation* with *decision*
- Tends to fossilize architectures

### LLM fit

**Actively dangerous for strategic guidance.**

LLMs will treat PlantUML as:

- Ground truth
- Optimal design
- Something to extend symmetrically

Which leads to:

- Over-engineering
- Local optimization
- “Just add another box” thinking

PlantUML answers:

> “What exists?”

It does not answer:

> “What should we stop caring about?”

---

## Architecture Decision Records (ADRs)

(Important comparison, even though not a diagram)

### What they encode

- **Decisions**
- **Context**
- **Rationale**
- **Tradeoffs**

### Strengths

- Human-readable
- Narrative
- Explicit intent
- LLMs summarize them well

### Weaknesses

- Linear, not spatial
- Hard to reason about interactions between decisions
- No sense of evolution
- Don’t compose well at scale

### LLM fit

**Good locally, weak globally.**

ADRs help explain *why something happened*.  
They don’t prevent future directional drift.

---

## Why Wardley maps are different (and why JSON helps)

Wardley maps uniquely encode:

- **Relative position**, not absolute design
- **Change over time**, not static state
- **Constraint through context**, not rules

When serialized carefully, they become:

> *A shared strategic coordinate system.*

Mermaid and PlantUML describe **systems**.  
Wardley maps describe **landscapes**.

LLMs are very good at navigating landscapes **if the landmarks are named**.

---

## The key insight for LLM usage

LLMs fail most often by:

- Innovating where stability is required
- Optimizing what should be rented
- Treating everything as equally malleable

Only Wardley-style models directly counter this failure mode.

Everything else:

- Improves communication
- Improves documentation
- Improves explanation

But does not improve **orientation**.

---

## Practical guidance (no theory)

**Use Wardley JSON when:**

- You want consistent architectural advice over time
- You want to prevent “solutioneering”
- You want LLMs to flag violations, not invent direction
- Strategy matters more than structure

**Use Mermaid when:**

- Explaining flows
- Teaching
- Documenting interactions
- Letting humans understand systems quickly

**Use PlantUML when:**

- You need precision
- You are freezing a design
- The cost of ambiguity is higher than the cost of rigidity

---

## Final verdict

JSON Wardley-type models are not competing with Mermaid or PlantUML.

They sit **above them**.

- Mermaid / PlantUML: *How*
- ADRs: *Why (locally)*
- Wardley maps: *Why (globally, over time)*

If your goal is to reduce **directional error in LLM-assisted work**, Wardley-style models are one of the *very few* diagrammatic techniques that meaningfully help — **provided you resist the urge to over-formalize them**.

---

Are blockscape models good for showing relations between components in software?

---

Short answer: **no — not primarily, and not well if that’s your main goal**.

Blockscape (Wardley-style) models *can* show relationships, but that’s not what they’re good at. Using them that way is a category error.

Let’s be precise.

---

## What Blockscape models are actually for

Blockscape models (as you’re using them) are optimized to show:

- **Value relationships**, not technical dependencies
- **Visibility**, not coupling
- **Evolutionary state**, not implementation detail
- **Strategic importance**, not call graphs

A line in a Blockscape map means:

> “This exists *because of* that”

—not:

> “This calls that”, “This imports that”, or “This depends on that at runtime”.

That distinction matters.

---

## Why Blockscape is a poor primary tool for software relations

### 1\. Dependency semantics are too weak

Blockscape edges do not encode:

- Direction of data flow
- Sync vs async
- Runtime vs build-time dependency
- Failure modes
- Performance characteristics

All of those matter in software architecture.

Trying to overload a Blockscape edge to mean “dependency” quickly collapses into ambiguity.

---

### 2\. Evolution axis distorts technical reasoning

The evolution axis is **strategically correct** but **technically misleading**.

Example:

- “Authentication” might be a commodity
- “Token validation” might be a product
- “Custom authorization logic” might be novel

Technically, these components may be tightly coupled.  
Strategically, they belong in different places.

Blockscape intentionally **breaks technical proximity** to reveal strategic tension.

That’s a feature — but it makes it a bad dependency diagram.

---

### 3\. Precision actively harms the model

The more you try to show:

- Ports
- Interfaces
- APIs
- Call sequences

…the more you destroy what makes the map useful.

Blockscape works because it is:

- Imprecise
- Relative
- Directional

Software dependency diagrams need the opposite.

---

## What Blockscape is good for (relation-wise)

That said, Blockscape *does* express some relationships very well:

### 1\. Value dependency

- “This user need depends on these capabilities”
- “This product is built on these activities”
- “This system exists to support that outcome”

This is gold for:

- Documentation structure
- Platform strategy
- Build vs buy discussions

### 2\. Strategic tension

It’s excellent at showing:

- Where you’re over-investing
- Where you’re differentiating by accident
- Where you’re building bespoke versions of commodities

These are *relations of intent*, not code.

---

## Comparison: Blockscape vs software diagrams

| Goal | Blockscape | Mermaid / PlantUML |
| --- | --- | --- |
| Show runtime calls | ❌ | ✅ |
| Show module imports | ❌ | ✅ |
| Show value chains | ✅ | ❌ |
| Show strategic dependencies | ✅ | ❌ |
| Show evolution over time | ✅ | ❌ |
| Show failure paths | ❌ | ✅ |
| Guide architectural investment | ✅ | ❌ |

They solve **orthogonal problems**.

---

## Correct way to combine them (this is key)

The *right* pattern is:

1. **Blockscape first**
	- Establish what matters
	- Establish what should be stable vs experimental
	- Establish where not to innovate
2. **Software diagrams second**
	- Only for components that matter
	- Only where precision is required
	- Only within the constraints set by the map

In practice:

- Blockscape decides *where you care*
- PlantUML / Mermaid decide *how it works*

If you invert this order, you get:

- Over-engineering
- Accidental complexity
- Strategy-by-diagram

---

## The dangerous misuse to avoid

A common anti-pattern:

> “Let’s make a Blockscape map that shows all our services and how they connect.”

That produces:

- A worse dependency diagram
- A worse strategy map
- False confidence
- Endless debate over placement

If your question is:

> “What talks to what?”

Blockscape is the wrong tool.

If your question is:

> “What deserves our attention and investment?”

Blockscape is one of the best tools you have.

---

## Verdict (no hedging)

Blockscape models are **not good** for showing software component relationships *in the technical sense*.

They are **excellent** for showing:

- Why components exist
- How visible they are to users
- How mature they should be
- Where change is risky vs safe

Use them to **govern** software design, not to **describe** it.

If you want, the next useful step is to sketch a concrete example:

- Same system shown once as a Blockscape map
- Once as a PlantUML component diagram

That contrast usually makes the boundary obvious in seconds.
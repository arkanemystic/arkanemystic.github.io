---
title: The Kernel at the Bottom of Everything
date: 2026-04-22
excerpt: On trust, proof, and why I built a guardrail system out of mathematics instead of code.
---


# The Kernel at the Bottom of Everything
*On trust, proof, and why I built a guardrail system out of mathematics instead of code.*

---

I didn't go looking for Lean 4. A friend showed it to me.

Adeel and I were talking. One of those late-night conversations that starts somewhere reasonable and ends up somewhere weird. He pulled up this proof assistant I'd never heard of. Lean 4. He was excited about it in that specific way he gets excited about math things, where he's not really explaining it to you so much as thinking out loud and you're just there.

The thing that stuck with me wasn't the syntax or the tooling. It was something he said about the kernel.

Lean's kernel is tiny. A few thousand lines of code. Everything in the whole system, every theorem, every proof, every logical claim you make, gets checked by that kernel. The kernel is small enough that you can actually read it. Audit it. Understand it fully. If the kernel says your proof is valid, the statement is true. Not "probably true" or "true in all the cases we tested." Just true. The math holds.

Adeel put it something like: the kernel isn't a detail, it's the foundation. Anything you build on top inherits the trustworthiness of whatever's at the bottom.

I kept thinking about that for weeks.

---

## Falling into formal verification

The weeks after that conversation were kind of consuming. I started reading everything I could find. Lean's Mathlib documentation. Papers on dependent type theory. The original Curry-Howard correspondence. There's this thing that happens when you go deep enough into a field where the references start to form a closed loop and you realize you've actually learned the shape of the territory. That happened somewhere around week three.

What I kept running into was how much of this world had been built out quietly, over decades, by people who genuinely believed that software could be made correct rather than just tested. The seL4 microkernel. CompCert. The Coq proofs underlying parts of Amazon's cryptographic infrastructure. Formal verification had been doing serious work in safety-critical systems for years. The AI safety world just hadn't caught up to it yet.

I started prototyping. The first attempts were rough. Getting Lean 4 to type-check anything nontrivial takes a specific kind of patience. The error messages are precise but they assume you already know what they mean. I spent a lot of time just learning to read the kernel's feedback, understanding what it was actually asking for when a proof obligation didn't discharge.

Slowly it started working. The types lined up. The proofs went through. Something that had been a late-night thought experiment became a system you could actually run.

## Writing it down

At some point I had enough that it felt worth writing up properly. My sister Veda came on as a co-author. She'd been following the project from the beginning and her thinking on the formal specification side sharpened a lot of the arguments that ended up in the paper.

Writing the paper forced a kind of clarity that building the system didn't. When you're implementing something you can stay in the weeds. When you're writing you have to know why each piece is there and be able to defend it. The hardest section was the one on what the protocol actually claims. It's easy to make formal verification sound like a complete solution to AI safety. It isn't. Writing precisely about what the guarantees are and where they end required a lot of back and forth.

The paper went up on arXiv in April. Seeing it there felt strange in a good way.

## The conversation with Professor Wijesekera

Someone pointed me toward Professor Duminda Wijesekera at George Mason. He works on formal methods and security systems and has spent a long time thinking about exactly the intersection the protocol lives in. I sent a cold email not really expecting much.

He responded and we met. I walked him through the architecture, the type encoding, the two-step NL to Lean 4 formalization pipeline. He asked sharp questions. The kind of questions that tell you the person across the table has actually thought about this domain for a long time and is pressure-testing your assumptions rather than just being polite.

One thing he pushed on was the formalization gap. Getting from natural language regulatory text to a precise Lean type is the hard part of the whole system. A human writes the formalization. That human can be wrong. The kernel will faithfully verify whatever you give it, but if the encoding of the regulation is incorrect, the guarantee breaks at the translation step rather than the verification step. He was right to flag it. We talked for a while about how you'd approach auditing the formalizations themselves, whether there were systematic ways to validate that the Lean types actually captured the intent of the regulation.

It was the most useful technical conversation I'd had since building the thing. The kind of feedback you can only get from someone who has spent years in the space and has already thought through the failure modes you haven't reached yet.

---

## Pitching it to the people who would actually use it

Building the system and writing the paper happened in a kind of insulated environment. Pitching it to compliance and AI security startups was different. That's where you find out which parts of your mental model are load-bearing and which ones you'd been taking for granted.

I reached out to a handful of companies working on AI governance and compliance infrastructure. Alinia AI. Zenity. Hawk AI. Cranium. The pitch was essentially: your current approach to guardrails is runtime enforcement, which means it shares failure modes with the system it's guarding. Formal verification moves the enforcement upstream, into the type system, where violation becomes structurally impossible rather than just unlikely.

The reception varied. The people with a security background got it immediately. They'd seen enough runtime enforcement failures to be genuinely interested in a different class of guarantee. The conversations with compliance-focused teams took longer. There's a translation step between "dependent types" and "audit-ready guarantee" and I got better at making that translation the more times I had to do it.

What I learned is that the hardest part of this isn't the verification. It's the formalization. Every startup I talked to wanted to know: who writes the Lean types? How do you validate that they correctly represent the regulation? How does a compliance officer who doesn't know Lean read and approve a formal specification? These are real questions. They're not blockers but they're the actual product problem, and they're more interesting than the technical problem I'd been focused on.

---

## What I'm actually claiming (and not claiming)

I want to be careful here because it's easy to overclaim.

This doesn't make AI safe in general. Alignment is hard, interpretability is hard, robustness is hard. Formal verification doesn't touch most of that. It only works where you can specify the constraint precisely enough to encode it. If you can't write it down formally, Lean can't help you.

What it does do, for the constraints you can specify: violation becomes structurally impossible. Not monitored. Not unlikely. Impossible, the same way a type error is impossible in a well-typed program. The system that would produce the violation is the same system that enforces the constraint, and it's correct by construction.

That's a narrow claim but it's a strong one. It matters most in exactly the domains where guardrails failing is most catastrophic. Finance, medical devices, critical infrastructure. Places where someone has already done the work of writing down precisely what's allowed and what isn't.

## The thing Adeel's framing gets right

Most trust in software is fragile and transitive. You trust the library because someone you respect recommended it. You trust the test suite because the person who wrote it was careful. At every link in the chain there's a human whose judgment could be wrong.

Lean's trust chain bottoms out somewhere different. The kernel is auditable. Its correctness has been formally studied. When it accepts a proof, the trust you need isn't in any individual. It's in the rules of dependent type theory, which have been stable for a long time and don't depend on anyone's good intentions.

That's what I mean when I say I built this out of mathematics instead of code. Code runs and might be wrong. A proof holds or it doesn't, and the kernel decides which. The goal was to push the safety-critical reasoning into the second category as much as possible.

A friend showed me a small kernel and said the foundation was the point. Turns out you can build a lot on a foundation like that.

---

*Paper: [arxiv.org/abs/2604.01483](https://arxiv.org/abs/2604.01483) · Demo: [axiom.devrashie.space](https://axiom.devrashie.space) · Code: [github.com/arkanemystic/lean-agent-protocol](https://github.com/arkanemystic/lean-agent-protocol)*
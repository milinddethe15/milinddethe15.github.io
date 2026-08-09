---
title: "Day 5: When Does a Training Script Become a Pipeline?"
date: 2026-06-17
description: "Learn why machine learning workflows evolve from Python scripts into pipelines and how Kubeflow Pipelines orchestrates reproducible ML workflows on Kubernetes."
tags: ["7-days-of-mlops"]
---
Yesterday I learned how machine learning teams improve models through hyperparameter tuning, AutoML, and large-scale experimentation.

That raised another question.

**What happens when training is no longer a single Python script?**

## The Script Starts Small

Most machine learning projects begin with something simple.

```python
data = load_data()

model = train(data)

evaluate(model)
```

Everything fits in one file.

Life is good.

Then the project grows.

## Reality Looks Different

A production training workflow rarely consists of three steps.

It often looks more like this.

```
Load Data
    ↓
Validate Data
    ↓
Transform Features
    ↓
Train Model
    ↓
Evaluate Model
    ↓
Register Model
```

Each step has its own logic.

Its own dependencies.

Its own failure modes.

What started as a script slowly becomes a workflow.

## The First Sign Of Trouble

Imagine training takes two hours.

The workflow looks like this:

```
Step 1: Validate Data
Step 2: Transform Features
Step 3: Train Model
Step 4: Evaluate Model
```

Now suppose Step 4 fails.

Do we really want to rerun the entire workflow?

Probably not.

The training step alone may cost significant time and compute.

This is where the limitations of scripts start to appear.

## Scripts Hide Structure

When everything lives inside one Python file, the workflow structure is invisible.

Consider this example.

```python
validate()

transform()

train()

evaluate()
```

Humans can see four stages.

Computers only see one process.

There is no understanding of:

* Dependencies
* Inputs
* Outputs
* Retry boundaries

The workflow exists.

But only inside the engineer's head.

## Pipelines Make Workflows Explicit

A pipeline makes those relationships visible.

Instead of writing:

```python
train()
```

We describe how each stage connects.

```
Validate
    ↓
Transform
    ↓
Train
    ↓
Evaluate
```

The workflow becomes a Directed Acyclic Graph (DAG).

Each node performs one responsibility.

Each edge represents a dependency.

Now the platform understands the workflow too.

## Why DAGs Matter

Before today, I thought DAGs were mostly an implementation detail.

Now I see them as a communication tool.

A DAG answers questions instantly.

```
What runs first?

What depends on what?

What can run in parallel?

Where did the failure occur?
```

Without reading a single line of code.

## Reproducibility At Workflow Scale

Earlier in this series I learned about: `Dataset Versioning` and `Experiment Tracking`.

Pipelines extend the same idea.

Now we're versioning the workflow itself.

```
Pipeline v1
        ↓
Pipeline v2
        ↓
Pipeline v3
```

The entire training process becomes reproducible.

Not just individual experiments.

## Kubeflow Pipelines

This is the problem [Kubeflow Pipelines](https://www.kubeflow.org/docs/components/pipelines/overview/) was designed to solve.

A pipeline can be broken into reusable components.

```
Data Validation Component

Feature Engineering Component

Training Component

Evaluation Component
```

These components are connected together to form a complete workflow.

```
Validate
    ↓
Transform
    ↓
Train
    ↓
Evaluate
```

Instead of a giant script, we now have reusable building blocks.

## The Kubernetes Connection

As someone coming from a platform engineering background, this was the most interesting part.

At first glance, Kubeflow Pipelines looks like a machine learning tool.

Underneath, it is really orchestrating workloads on Kubernetes.

A simplified view looks like this.

```
Kubeflow Pipeline
          ↓
Workflow Engine (ArgoWF)
          ↓
Kubernetes Pods
```

Each pipeline step eventually becomes a containerized workload.

That means we get many of the things Kubernetes already provides:

* Scheduling
* Resource isolation
* Retries
* Scalability

The workflow is expressed as ML concepts.

The execution happens using cloud-native primitives.

## Why Caching Matters

Imagine this pipeline.

```
Validate
    ↓
Transform
    ↓
  Train
```

You change only the training parameters.

Should the validation step run again?

Should feature engineering run again?

Probably not.

Pipeline systems can cache previous results.

```
Validate ✓ Cached

Transform ✓ Cached

Train → Execute
```

This saves both time and compute.

Something that becomes increasingly important as datasets grow.

## What I Learned Today

Before today, I viewed pipelines as automation.

Now I see them as infrastructure for reproducibility.

A script describes what to do.

A pipeline describes how work flows through a system.

That distinction becomes important once multiple people, datasets, experiments, and environments are involved.

## Today's Takeaway

A training script runs a workflow.

A pipeline defines a workflow.

## What's Next?

So far we've focused on training.

But another question remains.

How do we ensure training and production use the same features?

What happens when the feature used during training is different from the feature used during inference?

**Why do models sometimes fail even when training accuracy looks great?**

In Day 6, we'll explore feature stores, training-serving skew, and why platforms like Feast exist.

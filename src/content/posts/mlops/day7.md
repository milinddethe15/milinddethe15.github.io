---
title: "Day 7: Deployment Is Not The End"
date: 2026-06-19
description: "Learn how model serving, monitoring, drift detection, and retraining complete the MLOps lifecycle after deployment."
tags: ["7-days-of-mlops"]
---
Yesterday I learned why feature stores exist.

Models don't learn from raw data.

They learn from features.

And if training and production use different features, model quality can quietly degrade.

That raised one final question.

**What happens after a model is deployed?**

Today I learned that deployment is actually the beginning of the lifecycle.

## A Model Is Only Valuable In Production

A model sitting in a notebook creates no value.

A model stored on disk creates no value.

A model becomes useful only when users can interact with it.

That means turning this:

```
model.pkl
```

into something like this:

```
POST /predict
```

A trained artifact becomes a service.

## Serving A Model

At a high level, model serving looks similar to any other application.

```
   User
    ↓
   API
    ↓
Prediction
```

But there is an important difference.

Traditional applications execute business logic.

Machine learning services execute learned behavior.

The application is no longer making decisions through code alone.

The model is participating in those decisions.

## The Journey Of A Prediction

A single prediction often looks like this.

```
User Request
    ↓
Fetch Features
    ↓
Model Inference
    ↓
Prediction
    ↓
Response
```

The model is now part of a larger production system.

Everything around it matters:

* Latency
* Availability
* Scalability
* Reliability

This starts to look very familiar from a platform engineering perspective.

## Why Kubernetes Shows Up Again

Throughout this sprint, Kubernetes has been quietly sitting underneath many MLOps systems.

Pipelines run on Kubernetes.

Training jobs run on Kubernetes.

Serving systems often run on Kubernetes too.

A simplified serving architecture might look like this.

```
Inference Service
    ↓
Kubernetes
    ↓
   Pods
    ↓
Model Server
```

The model becomes another workload the platform needs to manage.

## KServe

One tool I explored was [KServe](https://kserve.github.io/website/docs/intro).

The idea is surprisingly simple.

Instead of managing deployments directly, we describe an inference service.

```
Model
    ↓
Inference Service
    ↓
Endpoint
```

The platform handles much of the operational complexity.

Things like:

* Scaling
* Rollouts
* Traffic routing

become easier to manage.

The model starts behaving like a first-class cloud-native workload.

## The Problem Nobody Notices

At this point, everything seems complete.

The model is deployed.

Users are getting predictions.

Metrics look healthy.

But there is a hidden problem.

The world changes.

## Data Changes Constantly

Imagine training a fraud detection model.

```
Training Data
    ↓
Fraud Patterns
    ↓
  Model
```

A few months later:

```
User Behavior Changes

Fraud Patterns Change

Business Rules Change
```

The model has not changed.

Reality has.

This is where machine learning differs from traditional software.

The code may still be correct.

The model may no longer be.

## Understanding Drift

Today I learned about drift.

A simplified example looks like this.

```
Training Data
      ↓
Distribution A
```

Months later:

```
Production Data
      ↓
Distribution B
```

The model is making predictions on data it was never really trained to understand.

This is called data drift.

Sometimes the relationship between inputs and outputs changes too.

That is often called concept drift.

Either way, model quality starts declining.

## Why Monitoring Matters

Earlier in my career, monitoring usually meant questions like:

```
CPU Usage?

Memory Usage?

Request Latency?
```

Those metrics are still important.

But ML systems introduce new questions.

```
Prediction Distribution?

Feature Distribution?

Model Accuracy?

Data Drift?
```

The infrastructure may be healthy.

The model may still be failing.

That was a new perspective for me.

## Closing The Loop

The most important thing I learned today is that production ML systems are not linear.

They are cyclical.

A simplified lifecycle looks like this.

![IMAGE: MLOps lifecycle](/images/mlops/mlops-lifecycle.jpg)

The output of production becomes the input to future training.

The system continuously evolves.

This is the operational reality that MLOps exists to manage.

## Looking Back At The Journey

Seven days ago, I started with a simple question.

Why isn't DevOps enough for machine learning?

Now the answer feels much clearer.

Machine learning introduces entirely new operational concerns.

We explored:

```
Day 1 → Why MLOps Exists

Day 2 → Reproducible Training

Day 3 → Data Versioning & Experiment Tracking

Day 4 → Hyperparameter Tuning & AutoML

Day 5 → Pipelines & Orchestration

Day 6 → Feature Stores

Day 7 → Serving, Monitoring & Retraining
```

What surprised me most is that almost every topic came back to the same idea.

Reproducibility.

Whether we're talking about:

* Data
* Experiments
* Pipelines
* Features
* Models

we are constantly trying to answer:

> Can we understand, reproduce, and trust this system?

## Today's Takeaway

Deployment is not the end of the machine learning lifecycle.

It's the point where the lifecycle begins again.

## What's Next?

This concludes my 7 Days of MLOps sprint.

The next step for me is going deeper into how modern AI platforms are built.

Questions I'm now interested in exploring include:

* Model registries
* Distributed training
* LLM serving
* Vector databases
* AI platform architecture
* Multi-tenant ML infrastructure

Thanks for following along 🚀

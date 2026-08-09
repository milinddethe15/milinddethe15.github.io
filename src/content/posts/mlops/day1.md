---
title: "Day 1: Why DevOps Is Not Enough for Machine Learning"
date: 2026-06-13
description: "Why DevOps alone is not enough for machine learning and how MLOps addresses data, models, and training-serving skew."
tags: ["7-days-of-mlops"]
---
Over the last [7 days](/tags/7-days-of-ai-platform-engineering/), I explored AI Platform Engineering.

I learned how GPUs are scheduled, how models are served, and what a production AI platform looks like.

But there is still one important question left unanswered:

**How does a model actually get from a notebook to production?**

That's where MLOps comes in.

Before learning tools like MLflow, Kubeflow Pipelines, or KServe, let's understand the problem MLOps is trying to solve.

## The World of Traditional Software

As engineers, we're familiar with the software delivery lifecycle.

A developer writes code.

The code is built, tested, and deployed.

```
Developer --> Write Code --> CI/CD --> Deploy --> Users
```

When something breaks, we usually ask:

* Did the code change?
* Did the configuration change?
* Did the infrastructure change?

Most of the answers can be found in Git (if GitOps is implemented).

## Machine Learning Is Different

Now imagine you're building a spam detection system.

You collect historical emails, train a model, and deploy it.

Everything works perfectly.

A few months later, users start reporting that spam emails are slipping through.

What changed?

The code didn't change.

The infrastructure didn't change.

The deployment didn't change.

The **data changed**.

That's the first big lesson of MLOps.

> In software, behavior is mostly determined by `code`.
> 
> In ML, behavior is determined by `code + data`.

## A New Artifact Appears

In software engineering, the primary artifact is code.

We store it in Git.

We version it.

We review it.

We deploy it.

Simple.

Machine learning introduces a new artifact:

```
- Code
- Data
- Model
```

And suddenly we need to manage all three.

Imagine someone asks:

> Which model is currently serving production traffic?

That sounds like a simple question.

But the real question is:

> Which Model?
> 
> Trained With Which Data?
> 
> Using Which Version Of Code?

This is where things become complicated.

## The Reproducibility Problem

Suppose your team trained a model six months ago.

The model achieved:

Accuracy: 95%

Today someone asks:

> Can we reproduce that exact model?

To answer that question, we need:

* Training code
* Dataset version
* Hyperparameters
* Feature engineering logic
* Training environment
* Model artifact

Without tracking all of these, reproducing a model becomes extremely difficult.

![IMAGE: Version control problem in ML systems](/images/mlops/version-control-problem.png)

## The Hidden Problem: Training-Serving Skew

Let's look at another problem.

Suppose your model was trained using:
```json
{
  "age": 25,
  "salary": 50000
}
```
Production suddenly sends:
```json
{
  "age": null,
  "salary": 50000
}
```
The model never saw this during training.

Predictions become unreliable.

Nothing crashed.

No alerts fired.

The API still returns responses.

But the model's quality degrades.

This is called: **Training-Serving Skew**

![IMAGE: Training-serving skew](/images/mlops/training-serving-skew.jpg)

## Why Monitoring Gets Harder

For traditional applications, we monitor:

* CPU
* Memory
* Latency
* Errors

If those metrics look healthy, we're usually happy.

But ML systems are different.

Imagine:
```
Latency = 20ms
Error Rate = 0%
CPU: Healthy
Memory: Healthy
```
Everything looks perfect.

The infrastructure is healthy.

But the model is not.

Model is producing garbage predictions.

Infrastructure says: **Healthy**

Business says: **Broken**

For companies:
> Prediction Accuracy ↓ (decreases)
>
> Business Impact ↑ (increases)

## Why DevOps Alone Is Not Enough

DevOps solved many problems for software delivery:

* CI/CD
* Infrastructure automation
* Monitoring
* Reliability

But machine learning introduces new challenges:

* Data Versioning 
* Experiment Tracking 
* Model Versioning 
* Training Pipelines
* Feature Management 
* Model Monitoring
* Continuous Retraining

These problems don't exist in traditional software systems.

They require new workflows, new tooling, and new platform capabilities.

This is why MLOps exists.

## MLOps

Its goal is simple:

> Make machine learning systems reproducible, scalable, observable, and reliable.

A modern MLOps platform looks something like this:
```
Data Sources
 ↓
Training Pipeline
 ↓
Experiment Tracking
 ↓
Model Registry
 ↓
Deployment
 ↓
Monitoring
 ↓
Retraining
```

This is the journey we'll explore over the next 7 days.

### What's Next?

Today we learned why DevOps practices alone are not enough for machine learning.

Unlike software systems, ML systems are driven by both code and data. As a result, every training run can produce a different model.

Now imagine you're training a model and experimenting with:

* Different datasets
* Different hyperparameters
* Different feature engineering techniques

Very quickly, you will end up with hundreds of model versions.

At that point, a new question emerges:

> Which model was actually the best, and how do we reproduce it?

This is the problem that Experiment Tracking was created to solve.

In Day 2, we'll explore how ML teams track experiments, compare training runs, and maintain reproducibility and why tools like MLflow have become a fundamental part of modern MLOps platforms.
---
title: "Day 6: Why Do Models Fail Even When Training Accuracy Looks Great?"
date: 2026-06-18
description: "Learn about feature stores, training-serving skew, and why machine learning teams use platforms like Feast to keep training and production data consistent."
tags: ["7-days-of-mlops"]
---
Yesterday I learned how machine learning workflows evolve from scripts into pipelines.

Pipelines help orchestrate:

```
Validate Data
    ↓
Transform Features
    ↓
Train Model
    ↓
Evaluate Model
```

That raised another question.

**Why do models sometimes fail in production even when they performed well during training?**

## The Model Is Usually Not The Problem

Imagine a model achieves:

```
Accuracy = 95%
```

during training.

Everyone is happy.

The model gets deployed.

A few weeks later, performance drops dramatically.

At first, I assumed something was wrong with the model.

But often the model isn't the problem.

The inputs are.

## Models Learn From Features

Earlier in this series, we've talked a lot about datasets.

Today I learned that datasets are only part of the story.

Models don't learn directly from raw data.

They learn from features.

For example:

```
Customer Data
        ↓
Feature Engineering
        ↓
average_purchase_30_days, purchase_count, account_age
```

These transformed values become the actual inputs to the model.

In many ways, features are the real product of an ML system.

## Training And Production Live In Different Worlds

During training, feature generation often happens in batch.

Imagine we calculate:

```
average_purchase_30_days
```

using historical data.

The model learns from that feature.

Now let's look at production.

A different service computes the same feature.

Unfortunately, the implementation is slightly different.

Instead of:

```
average_purchase_30_days
```

it computes:

```
average_purchase_7_days
```

The feature name might even remain unchanged.

The model still receives input.

Nothing crashes.

But the meaning of the data has changed.

## The Silent Failure

This is what makes ML systems different from traditional software.

When an API breaks:

```
500 Internal Server Error
```

Everyone notices.

When a feature changes:

```
Prediction Quality ↓
```

The system still works.

Just incorrectly.

These failures are much harder to detect.

## Training-Serving Skew

Today I learned the name for this problem.

Training-serving skew.

A simplified view looks like this:

```
Training
    ↓
Feature A
    ↓
  Model
```

but in production:

```
Serving
    ↓
Feature B
    ↓
Same Model
```

The model is identical.

The features are different.

The results become unreliable.

This is one of the most common causes of production ML issues.

## Why Feature Engineering Becomes Infrastructure

Before today, I viewed feature engineering as a data science task.

Now I think it's also an infrastructure problem.

A feature must be:

* Consistent
* Reusable
* Versioned
* Available during training
* Available during inference

Without those guarantees, models become difficult to trust.

This starts sounding very similar to problems we've already seen throughout MLOps.

Reproducibility appears again.

## Feature Stores

This is the problem feature stores were designed to solve.

A feature store becomes the source of truth for feature definitions.

Instead of every team implementing features independently:

```
Training Team
    ↓
Custom Feature Logic

Serving Team
    ↓
Different Feature Logic
```

both use the same feature definitions.

```
Feature Store
    ↓
Training

Feature Store
    ↓
Serving
```

Consistency becomes much easier to maintain.

## Online And Offline Features

One concept that initially confused me was the distinction between online and offline features.

The difference is actually simple.

Offline features are used during training.

```
Historical Data
        ↓
Training Features
```

Online features are used during inference.

```
Live Requests
        ↓
Prediction Features
```

The challenge is ensuring both environments produce the same feature values.

That is exactly what feature stores help manage.

## Exploring Feast

One popular open-source feature store is [Feast](https://feast.dev/).

A simplified architecture looks like this:

```
      Raw Data
         ↓
 Feature Definitions
         ↓
       Feast
       ↙   ↘
Training   Inference
```

Instead of rebuilding feature logic multiple times, teams define features once and reuse them everywhere.

The feature becomes a managed asset.

Not just a piece of code.

## A Familiar Pattern

One thing I keep noticing throughout this sprint is that the same pattern appears repeatedly.

We started by versioning code.

Then we versioned datasets.

Then we tracked experiments.

Then we defined pipelines.

Now we're managing features.

Every step is solving a reproducibility problem.

Feature stores are really another layer in that story.

## What I Learned Today

Before today, I assumed model quality was mostly determined by algorithms.

Now I think feature quality matters even more.

A sophisticated model trained on inconsistent features will still produce unreliable predictions.

Good features often matter more than fancy models.

## Today's Takeaway

Models learn from features.

If training and production use different features, the model is learning one reality and serving another.

## What's Next?

So far we've focused on training systems.

But machine learning systems only create value when they serve predictions to users.

How does a trained model become an API?

How do we scale inference?

How do we monitor production behavior?

**What happens after a model is deployed?**

In Day 7, we'll explore model serving, monitoring, drift detection, and the complete MLOps lifecycle.

Stay tuned!

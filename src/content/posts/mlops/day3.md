---
title: "Day 3: If Git Versions Code, What Versions Data?"
date: 2026-06-15
description: "Learn why machine learning teams need data versioning and experiment tracking, and how tools like DVC and MLflow help make experiments reproducible."
tags: ["7-days-of-mlops"]
series: "7 Days of MLOps"
---
Yesterday I learned that reproducibility is one of the foundations of MLOps.

A notebook can help discover a good model.

A reproducible workflow helps others trust it.

That raised another question.

**If Git versions code, what versions data?**

## Git Solved One Problem

Software engineering has a remarkable advantage.

Code is the source of truth.

If a bug appears, we can inspect commits.

If a deployment breaks, we can roll back.

Git gives us a timeline of how the system evolved.

```
Commit A
    ↓
Commit B
    ↓
Commit C
```

Every change is recorded.

Machine learning introduces a new dependency.

Data.

## Data Changes Too

Imagine we train a model today.

```
customers.csv
    ↓
Train Model
    ↓
92% Accuracy
```

A month later, new customer records arrive.

The dataset changes.

We retrain the model.

```
customers.csv
    ↓
Train Model
    ↓
87% Accuracy
```

What happened?

Was the model worse?

Did the data quality change?

Did new patterns appear?

Without knowing which dataset version was used, answering these questions becomes difficult.

## The Missing Timeline

Git gives us: `Code Version`


But machine learning also needs: `Dataset Version`

A model is really the result of two things.

```
Code + Data -> Model
```

Tracking only half of that equation is not enough.

## DVC

This is the problem [Data Version Control](https://dvc.org/) (DVC) was designed to solve.

Instead of treating datasets as random files on a laptop, DVC treats them as versioned assets.

A simplified workflow looks like this:

```
git add train.py

dvc add customers.csv
```

Now both code and data have history.

```
Git -> Code Versions

DVC -> Data Versions
```

![IMAGE: How DVC pipelines connect code and data together](https://dvc.org/img/flow.gif)

For more details: https://doc.dvc.org/start/data-pipelines/data-pipelines

For the first time, we can answer questions like:

* Which dataset trained this model?
* Which version produced the best accuracy?
* Can we recreate that training run?

That is a huge step toward reproducibility.

## Reproducibility Is Only Half The Story

Let's assume we solved data versioning.

Another problem appears immediately.

Imagine running three experiments.

```
Run 1 -> 82%

Run 2 -> 88%

Run 3 -> 91%
```

Great.

Now answer these questions.

Which learning rate produced Run 3?

Which feature set was used?

Which model artifact was generated?

Which code version was running?

If you're storing results in a spreadsheet, things get messy very quickly.

## Experiments Need Metadata

A machine learning experiment contains much more than a metric.

It includes:

* Parameters
* Metrics
* Artifacts
* Dataset versions
* Code versions

Without this information, a number like "91% accuracy" is almost meaningless.

The result matters.

But the path to the result matters even more.

## MLflow

This is where experiment tracking systems become useful.

Instead of manually recording every training run, tools like MLflow automatically capture metadata.

```
Training Run
    ↓
Parameters
Metrics
Artifacts
```

Each experiment becomes searchable.

Comparable.

Reproducible.

A team can finally answer:

> Why was this model deployed?

Instead of:

> I think it was the one that performed best.

## Putting It Together

Before today, I thought experiment tracking and data versioning were separate concerns.

Now I see them as two parts of the same problem.

Data versioning answers:

> Which data produced this model?

Experiment tracking answers:

> Which training process produced this model?

Together they create a complete record.

```
Code
 +
Data
 ↓
Experiment
 ↓
Model
```

Without any one of those pieces, reproducibility starts to break down.

## Why This Matters For MLOps

Machine learning is fundamentally experimental.

Experiments generate models.

Models create business decisions.

Those decisions need to be traceable.

That traceability starts with versioning data and tracking experiments.

## Today's Takeaway

A model is not just code.

A model is code, data, and the experiment that connected them.

## What's Next?

Today we learned how to version data and track experiments.

That leads to another practical challenge.

What happens when we want to improve the model?

Should we manually try hundreds of parameter combinations?

Or can the process be automated?

**How do ML teams systematically find better models?**

In Day 4, we'll explore hyperparameter tuning, AutoML, and why training one model is rarely enough.

Stay tuned 🚀

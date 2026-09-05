---
title: "Day 2: From Notebook to Reproducible Training"
date: 2026-06-14
description: "Learn why Jupyter notebooks are great for experimentation but insufficient for reproducible machine learning workflows."
tags: ["7-days-of-mlops"]
series: "7 Days of MLOps"
---
[Yesterday](/posts/mlops/day1/) I learned why DevOps alone is not enough for machine learning.

Software systems change when code changes.

ML systems can change when the data changes.

That raised another question.

**How do ML engineers actually build models in the first place?**

## The Notebook Is Where Most ML Projects Begin

Most machine learning projects start with a Jupyter notebook.

You load a dataset.

Train a model.

Generate a metric.

Maybe even create a nice chart.

Everything feels simple.

```
data.csv -> notebook.ipynb -> accuracy = 92%
```

At first, this seems completely reasonable.

Then the project survives longer than a weekend.

## The First Problem Appears

Imagine this.

Last month you trained a model that achieved 92% accuracy.

Today you retrain it.

Now it achieves 87%.

What changed?

Was it:

* The dataset?
* The preprocessing code?
* The model parameters?
* The train-test split?

You start investigating.

Then you realize something uncomfortable.

The notebook contains 40 cells.

Some were executed.

Some were not.

Some were modified after training.

Nobody knows the exact sequence of steps that produced the original result.

The notebook contains the experiment.

But it doesn't reliably capture how the experiment happened.

## Why Reproducibility Matters

In traditional software, reproducibility is relatively straightforward.

Given the same code and inputs, the application should behave the same way.

Machine learning adds another variable.

**Data**.

```
Code + Data = Model
```

If either changes, the model changes.

This means an ML engineer needs to answer questions like:

* Which dataset was used?
* Which features were selected?
* Which model parameters were chosen?
* Which evaluation method was used?

Without those answers, results become difficult to trust.

## Train-Test Split Looks Simple

One common workflow looks like this:

```
Dataset
    ↓
Train Set (80%)
    +
Test Set (20%)
```

The model learns from the training set.

The test set evaluates performance.

Simple.

But there is a subtle problem.

What if the test set happens to be unusually easy?

Or unusually difficult?

The reported accuracy may not reflect reality.

A single split can be misleading.

## Cross Validation Gives A Better Answer

This is where cross validation becomes useful.

Instead of evaluating the model once, we evaluate it multiple times.

A common approach is K-Fold Cross Validation.

```
Fold 1 → Train + Evaluate
Fold 2 → Train + Evaluate
Fold 3 → Train + Evaluate
Fold 4 → Train + Evaluate
Fold 5 → Train + Evaluate
```

The final score becomes the average across all folds.

Instead of asking:

> "How did the model perform on this particular split?"

We ask:

> "How does the model perform across many different splits?"

That is usually a much more reliable measure.

## The Real Goal Is Not Accuracy

Before learning MLOps, I assumed the goal of training was to achieve the highest accuracy possible.

Now I think that's only part of the story.

A model with 95% accuracy is not very useful if nobody can reproduce it.

A model with slightly lower accuracy but a fully reproducible workflow is often more valuable.

Reproducibility is not an optimization.

It is a requirement.

## Building A Better Project Structure

As projects grow, notebooks alone become difficult to manage.

A more maintainable structure separates experiments from production code.

```text
housing-price-prediction/

├── notebooks/
├── data/
├── src/
├── models/
└── requirements.txt
```

The notebook becomes a place for exploration.

Reusable logic moves into source files.

This makes experiments easier to repeat and maintain.

## Why This Matters For MLOps

Today's lesson was not really about notebooks.

It was about reproducibility.

Machine learning is fundamentally experimental.

Experiments only become valuable when their results can be reproduced.

That is the foundation upon which the rest of MLOps is built.

## Today's Takeaway

A notebook can help discover a good model.

A reproducible workflow helps others trust it.

## What's Next?

Today we focused on reproducible training.

That leads to another practical problem.

Imagine the dataset changes next week.

How do we know exactly which version of the data produced a particular model?

**If Git versions code, what versions data?**

In Day 3, we'll explore data versioning with DVC and learn why tracking datasets is just as important as tracking code.

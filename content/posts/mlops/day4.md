+++
title = "Day 4: Training One Model Is Easy. Finding The Best One Is Hard."
date = "2026-06-16"
description = "Learn how machine learning teams improve model performance using cross validation, hyperparameter tuning, AutoML, and parallel experimentation."
tags = [
"7-days-of-mlops"
]
+++

Yesterday I learned how machine learning teams version datasets and track experiments.

That means we can finally answer questions like:

* Which dataset trained this model?
* Which parameters produced this result?
* Which experiment was deployed?

That raised another question.

**How do ML teams systematically find better models?**

## Training One Model Is Easy

Most machine learning tutorials look like this:

```
Dataset
    ↓
Train Model
    ↓
Accuracy = 85%
```

Done.

The model works.

But in practice, nobody trains a single model.

A machine learning project is really a search problem.

We're searching for the best combination of:

* Features
* Algorithms
* Parameters

The first model is usually just the starting point.

## The Hidden Knobs

Most machine learning algorithms have settings that control their behavior.

These settings are called hyperparameters.

For example:

```
Random Forest

Trees = 100

Max Depth = 5
```

Changing these values can significantly affect performance.

```
Model A → 85%

Model B → 89%

Model C → 91%
```

Same dataset.

Same algorithm.

Different hyperparameters.

Different results.

The challenge is figuring out which combination works best.

## Manual Tuning Doesn't Scale

At first, manual tuning feels reasonable.

You change a parameter.

Train again.

Check the result.

Repeat.

```
depth=3
depth=5
depth=7
depth=10
```

This works for a few experiments.

Then the number of possibilities explodes.

Imagine:

```
5 learning rates
×
5 tree depths
×
5 estimators
```

That's already: `125 experiments`

Nobody wants to run those manually.

## Grid Search

One solution is Grid Search.

The idea is simple.

Try every combination.

```
Parameter Space
        ↓
Try Everything
        ↓
Select Best Result
```

This guarantees we explore all candidate configurations.

The downside is obvious.

It becomes expensive very quickly.

As the number of parameters grows, the search space grows too.

## Random Search

This led me to another interesting observation.

Not every parameter matters equally.

Instead of trying every combination, we can randomly sample configurations.

```
Parameter Space
        ↓
Random Samples
        ↓
Best Candidate
```

This approach is called Random Search.

Surprisingly, it often performs nearly as well as Grid Search while evaluating far fewer models.

Sometimes working smarter beats working harder.

## Why Cross Validation Matters Again

[Earlier in this series](/posts/mlops/day2/#cross-validation-gives-a-better-answer), I learned about cross validation.

Today I realized why it becomes even more important.

Imagine two parameter combinations.

```
Configuration A → 91%

Configuration B → 90%
```

If those numbers come from a single train-test split, the comparison may be misleading.

Cross validation provides a more reliable evaluation.

Instead of optimizing for one lucky split, we're optimizing for performance across multiple splits.

```
Configuration
        ↓
Cross Validation
        ↓
Average Score
```

This gives us much more confidence in the result.

## AutoML

At this point I started wondering:

Why am I choosing algorithms manually at all?

Why not automate the entire search process?

This is the idea behind [AutoML](https://www.automl.org/automl/).

Instead of manually selecting:

* Algorithms
* Hyperparameters
* Search strategies

we let a system explore the possibilities automatically.

```
Dataset
    ↓
AutoML
    ↓
Best Candidate Model
```

The goal isn't to replace engineers.

The goal is to automate repetitive experimentation.

## A Practical Example

One lightweight AutoML framework I explored was FLAML.

The workflow looks surprisingly simple.

```
Dataset
    ↓
FLAML
    ↓
Model Selection
    ↓
Hyperparameter Optimization
    ↓
Best Model
```

Instead of manually training dozens of models, the search process becomes automated.

What previously required hours can often be reduced to minutes.

## The Next Bottleneck

All of this creates a new problem.

Imagine: `100 Experiments`

Each experiment takes: `5 Minutes`

Total time: `500 Minutes`

More than 8 hours.

Now we're waiting on compute instead of ideas.

This is where parallel execution becomes important.

Libraries like [Joblib](https://joblib.readthedocs.io/en/latest/#module-joblib) can run multiple experiments simultaneously.

![IMAGE: Multiple experiments running in parallel](/images/mlops/distributed-experiments.jpg)

Instead of running experiments sequentially, we can evaluate them in parallel.

The search becomes much faster.

## What I Learned Today

Before today, I thought model training was the difficult part.

Now I think model selection is often the harder problem.

Training one model is easy.

Finding the best model requires systematic experimentation.

That means:

* Reliable evaluation
* Hyperparameter tuning
* Automated search
* Efficient compute usage

This starts to feel much closer to engineering than trial and error.

## Today's Takeaway

Machine learning is not about training a model.

It's about searching for a better one.

## What's Next?

Today we explored how teams run many experiments to find better models.

That creates another challenge.

What happens when training is no longer a single Python script?

What happens when we have:

```
Validate Data
    ↓
Feature Engineering
    ↓
Train
    ↓
Evaluate
    ↓
Register Model
```

How do we orchestrate all of that reliably?

**When does a training script become a pipeline?**

In Day 5, we'll explore machine learning pipelines and how platforms like [Kubeflow](https://www.kubeflow.org/) orchestrate complex workflows.

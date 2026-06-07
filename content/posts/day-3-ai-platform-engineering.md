+++
title = "Day 3: Why GPU Sharing Is Hard"
date = "2026-06-06"
description = "Why GPU utilization is hard: resource fragmentation, sharing strategies (MIG, time-slicing, batching), and cost impacts."
tags = [
    "7-days-of-ai-platform-engineering"
]
+++

In Day 2, I learned how Kubernetes discovers GPUs using Device Plugins.

Once a GPU is exposed as a resource, a Pod can request it just like CPU or memory.

That led me to a new question:

**If Kubernetes can schedule GPUs, why is GPU utilization still such a big problem?**

The answer is simple:

**Most workloads don't use an entire GPU.**

## The GPU Utilization Problem

Imagine you have an NVIDIA A100 GPU with 80 GB of memory.

Now suppose your inference workload only needs:

- 10 GB of GPU memory
- 20% GPU utilization

Kubernetes still schedules the Pod like this:

```
Pod A
↓
1 GPU Requested
↓
1 GPU Allocated
```

The remaining GPU resources sit idle.

You paid for the entire GPU.

But you're only using a fraction of it.

![IMAGE: Single Pod occupying an entire GPU while most GPU resources remain unused](/images/20%-gpu-util.svg)

This is called **resource fragmentation**.

## Why CPUs Are Different

With CPUs, multiple Pods can share the same machine.

For example:

```
Node
├── Pod A (1 CPU)
├── Pod B (2 CPU)
├── Pod C (1 CPU)
└── Pod D (4 CPU)
```

Kubernetes is very good at packing workloads together.

GPUs are trickier.

Traditionally, a GPU is allocated exclusively to a single Pod.

That means:

```
GPU
└── Pod A
```

Even if Pod A only uses a small percentage of the GPU.

## The Cost Problem

This becomes expensive quickly.

Imagine:

- 8 GPUs in a cluster
- Every workload uses only 25% of a GPU
    

In theory, the cluster is only doing useful work with 2 GPUs.

The remaining compute capacity is wasted.

For organizations serving LLMs or running inference at scale, this directly translates into higher infrastructure costs.

The challenge isn't getting GPUs.

The challenge is keeping them busy.

## How The Industry Solves This

To improve utilization, platforms use techniques such as:

### Time Slicing

Multiple workloads take turns using the same GPU.

Think of it like CPU time-sharing.

![IMAGE: Multiple Pods sharing GPU through time slicing](https://run-ai-docs.nvidia.com/~gitbook/image?url=https%3A%2F%2F3278325112-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FLiY1aIqfxD3a58ufUYOM%252Fuploads%252Fgit-blob-708874840bd68200fe1ebdc6c21fbbf9f5097934%252Fstall1.png%3Falt%3Dmedia&width=768&dpr=3&quality=100&sign=a02f67d5&sv=2)

For more detail: 

https://run-ai-docs.nvidia.com/saas/platform-management/runai-scheduler/resource-optimization/time-slicing

### MIG (Multi-Instance GPU)

Some NVIDIA GPUs can be partitioned into smaller logical GPUs.

Instead of one large GPU:

```
80 GB GPU
```

You can create:

```
10 GB GPU
10 GB GPU
20 GB GPU
40 GB GPU
```

Each workload gets its own isolated slice.

![IMAGE: MIG partitioning a large GPU into multiple smaller GPUs](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/latest/_images/gpu-mig-overview.jpg)

For more details: 

https://docs.nvidia.com/datacenter/tesla/mig-user-guide/latest/introduction.html

### Model Batching

Inference systems combine multiple requests into a single GPU execution.

Instead of processing requests one by one, they process them together.

This keeps the GPU busier and improves throughput.

We'll see this later when looking at vLLM.

## Why This Matters For AI Platforms

When I first started learning AI infrastructure, I assumed GPUs were the scarce resource.

Now I realize utilization is the scarce resource.

A cluster might have plenty of GPUs.

The real challenge is making sure they aren't sitting idle.

This is why AI platform teams spend so much time thinking about:

- GPU sharing
- Resource fragmentation
- Scheduling
- Batching
- Capacity planning

All of these exist for one reason:

**GPUs are expensive.**

## Today's Takeaway

Kubernetes can schedule GPUs.

But scheduling them efficiently is a completely different challenge.

The goal isn't simply to allocate GPUs.

The goal is to maximize utilization while keeping workloads performant.

Tomorrow I'll explore another consequence of this problem:

**Why AI workloads need different scheduling strategies than traditional applications.**
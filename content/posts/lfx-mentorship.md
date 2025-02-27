+++
authors = ["Milind Dethe"]
title = "LFX Mentorship: My Experience as Mentee with CNCF Thanos"
date = "2024-12-04"
description = ""
tags = [
    "experience",
    "LFX",
]
+++

![](/images/lfx-thanos-cover.png)
This year has been full of opportunities and learning experiences for me. However, it wasn’t always smooth sailing. Earlier this year, I applied for [**GSoC’24**](https://summerofcode.withgoogle.com) and [**LFX’24**](https://lfx.linuxfoundation.org/tools/mentorship/) **Term 1 & 2**, but unfortunately, didn’t get selected. It was disappointing, but I chose not to give up. Instead, I worked on improving myself, learning from my mistakes, and preparing better.

When **LFX’24 Term 3** applications opened, I applied again. This time, I got selected! My project was [**CNCF - Thanos: Add support for hedged requests (2024 Term 3)**](https://mentorship.lfx.linuxfoundation.org/project/541a5bb5-09fd-47a9-a244-a65386aa7f7c) with amazing mentors - [Giedrius Statkevičius](https://github.com/GiedriusS) and [Saswata Mukherjee](https://github.com/saswatamcode). It turned out to be a great experience.

![](/images/lfx-selection-email.png)

***

## About the Project

[Thanos](https://thanos.io) is an open-source project under the **Cloud Native Computing Foundation (CNCF)**. It provides scalable, highly available, and cost-efficient storage and querying for [Prometheus](https://prometheus.io) metrics.

My project idea focused on implementing **hedged requests** in Thanos. In distributed systems, network delays, server load, or other unpredictable factors can occasionally result in slow responses.

**Hedged requests** are a smart way to tackle such delays. The idea is straightforward: if a request to a server takes too long to respond, the system sends a duplicate (or “hedged”) request to another server or replica that might respond faster. Whichever response arrives first is used, ensuring quicker query times and an overall better user experience.

The challenge lies in deciding _when_ to send the hedged request. Sending it too early might waste resources, while sending it too late might not significantly reduce the delay. To address this, [**Giedrius**](https://github.com/GiedriusS) suggested using [**T-Digest algorithm**](https://medium.com/@mani./t-digest-an-interesting-datastructure-to-estimate-quantiles-accurately-b99a50eaf4f7), which dynamically calculates response time percentiles (e.g., the 90th percentile). Using this data, the system can estimate an optimal threshold for sending a hedged request.

By introducing hedged requests, the project aimed to improve performance, reduce tail latencies, and offer users a smoother experience when querying stored data from object storage.

* * *
## The Aim of the Project

1.  **Add Hedged Requests**: Minimize delays by sending hedged requests when needed.
    
2.  **Use** **T-Digest Algorithm**: Dynamically calculate response time percentiles to decide when to send hedged requests.

* * *

## What I learned

This mentorship taught me a lot, both technically and personally. Here are some key takeaways from my journey:

1.  **Working with a Large Codebase**
    
    Thanos is a big and complex project. At first, it felt overwhelming to even understand how things worked. But by reading the documentation, debugging, and asking my mentor questions, I slowly started to figure it out.
    
    One resource that helped me a lot was the video **[Enlightning - Scaling Your Metrics with Thanos](https://www.youtube.com/watch?v=1qvcVJiVx7M)**. It explained Thanos's components clearly and gave me a better understanding of how the project works.

2.  **Implementing the Project Idea**
    
    For the implementation, I used two libraries:
    
    
    *   [cristalhq/hedgedhttp](https://github.com/cristalhq/hedgedhttp): This provided the functionality for hedged requests.
        
    
    * [caio/go-tdigest](https://github.com/caio/go-tdigest): This enabled me to calculate response time percentiles dynamically, which was essential for deciding when to send hedged requests.
        
        Integrating these libraries into Thanos wasn’t always straightforward, but they made the implementation easier overall. Whenever I faced problems or had doubts, my mentors were always there to guide me.
        
        
3.  **Mentorship Experience**
    
    My mentors, **Giedrius** and **Saswata**, were incredibly supportive throughout the project. They were always open to questions and offered clear explanations.
    
    One piece of advice from Giedrius that really struck a chord with me was: _\\"Love what you do.\\"_ It’s such simple advice, but as a software developer, it couldn’t be more true. Every day brings new challenges and learning opportunities, and without loving the process, it’s hard to keep going.
    
    Saswata’s story of how he made his way to Red Hat was really inspiring and motivating. It made me realise that with hard work and passion, it’s possible to achieve big things in life, especially in the open-source world.
    
    Looking back, I feel I should have asked more about their experiences in open-source and sought their advice for my future.
    
    ![](/images/lfx-last-meet-pic.png)

* * *

## Final Thoughts

Being part of the **LFX Mentorship program** has been a fantastic experience. I have learned so much, not just about coding but also about how to contribute to open source and work with a community.

This journey has taught me that failure is not the end—it’s a step towards improvement. To anyone who feels discouraged after rejection, my advice is simple: keep learning, keep trying, and don’t lose hope.

I’m thankful to CNCF, my mentors, and the Thanos community for giving me this opportunity. This experience has boosted my confidence and motivated me to continue contributing to open source projects.

_If you have questions about my experience or the project, feel free to reach out—I’d be happy to share! 😊_
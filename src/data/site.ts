export const SITE = {
  title: '@milinddethe15',
  name: 'Milind Dethe',
  description:
    'Platform and DevOps engineer working on Kubernetes, AWS, and cloud-native infrastructure. CKA certified. Ex-Atlan, LFX mentee at CNCF Thanos, Kubeflow contributor.',
  email: 'milinddethe15@gmail.com',
  github: 'https://github.com/milinddethe15',
  linkedin: 'https://www.linkedin.com/in/milind-dethe/',
  x: 'https://twitter.com/milinddethe15',
  // /resume/ (public/resume/index.html) also redirects to this same file,
  // so <domain>/resume keeps working as a shareable short link.
  resume: 'https://drive.google.com/file/d/1BbZS8mHuxcgBiR5ZlOw5_cPORrJ6X3wj/view?usp=sharing',
  cloudflareToken: '06221de30e1e4ec2870a1f8dc46d48ed',
  gaId: 'G-73ZGWNVCPE',
};

export const STACK = [
  'Kubernetes',
  'AWS',
  'Go',
  'Terraform',
  'ArgoCD',
  'Prometheus',
  'Grafana',
  'Helm',
];

export interface Project {
  title: string;
  description: string;
  skills: string[];
  source: string;
  image?: string;
}

export const PROJECTS: Project[] = [
  {
    title: 'LLM Inference Platform',
    description:
      'A production-style LLM inference platform built with KServe, vLLM, llm-d, Envoy Gateway, Argo CD, and Helm — exploring scalable model serving, request routing, and GitOps workflows.',
    skills: ['Kubernetes', 'KServe', 'vLLM', 'Argo CD', 'Helm'],
    source: 'https://github.com/milinddethe15/llm-inference-platform',
    image: '/images/llm-platform.png',
  },
  {
    title: 'DeployGuard',
    description:
      'A Kubernetes operator that analyzes Prometheus metrics during rollouts to automatically detect regressions and enable safer, metrics-driven deployments.',
    skills: ['Go', 'Kubernetes', 'Prometheus', 'Operator SDK'],
    source: 'https://github.com/milinddethe15/deployguard',
    image: '/gifs/deployguard.webm',
  },
  {
    title: 'Predictive Kubernetes Autoscaler',
    description:
      'An intelligent autoscaling system that forecasts workload demand and proactively scales Kubernetes applications using KEDA and time-series predictions.',
    skills: ['KEDA', 'Python', 'FastAPI', 'Kubernetes', 'Prophet'],
    source: 'https://github.com/milinddethe15/keda-ml-autoscaler',
    image: '/images/autoscaler.png',
  },
  {
    title: 'Store Provisioning Platform',
    description:
      'Automated provisioning of isolated MedusaJS stores using Argo Workflows, enabling repeatable deployments with GitOps and cloud-native infrastructure.',
    skills: ['Argo Workflows', 'Kubernetes', 'AWS', 'Go', 'GitOps'],
    source: 'https://github.com/milinddethe15/store-provision-platform',
    image: '/gifs/store-platform.webm',
  },
  {
    title: 'AI Platform Engineering',
    description:
      'A seven-day build log exploring GPU discovery, KV cache management, batching, and request routing for AI workloads.',
    skills: ['Kubernetes', 'GPU scheduling', 'Go', 'LLMs'],
    source: '/tags/7-days-of-ai-platform-engineering/',
    image: '/images/overview-ai-platform.webp',
  },
  {
    title: 'MLOps Foundations',
    description:
      'A practical walk-through of the MLOps lifecycle, from version control and training data to serving, monitoring, and iteration.',
    skills: ['MLOps', 'Model serving', 'Experiment tracking', 'Python'],
    source: '/tags/7-days-of-mlops/',
    image: '/images/mlops/mlops-lifecycle.jpg',
  },
];

export interface OssContribution {
  title: string;
  repo: string;
  url: string;
}

// Real merged upstream PRs (see the "all merged" search link on the homepage).
export const OSS: OssContribution[] = [
  {
    title: 'store: support hedged requests',
    repo: 'thanos-io/thanos',
    url: 'https://github.com/thanos-io/thanos/pull/7860',
  },
  {
    title: 'fix: delete a pipeline along with all its versions',
    repo: 'kubeflow/pipelines',
    url: 'https://github.com/kubeflow/pipelines/pull/12019',
  },
  {
    title: 'feat: run CI workflows on /ok-to-test label',
    repo: 'kubeflow/trainer',
    url: 'https://github.com/kubeflow/trainer/pull/2639',
  },
  {
    title: 'receive: unhide tsdb out-of-order flags',
    repo: 'thanos-io/thanos',
    url: 'https://github.com/thanos-io/thanos/pull/8032',
  },
  {
    title: 'fix: respect browser theme preference on initial load',
    repo: 'prometheus/docs',
    url: 'https://github.com/prometheus/docs/pull/2733',
  },
];

export const OSS_ALL_URL =
  'https://github.com/search?q=is%3Apr+is%3Amerged+author%3Amilinddethe15+-user%3Amilinddethe15&type=pullrequests';

export interface Experience {
  when: string;
  org: string;
  role: string;
  url: string;
  detail: string;
}

export const EXPERIENCE: Experience[] = [
  {
    when: 'Jun — Nov 2025',
    org: 'Atlan',
    role: 'Software Engineer Intern, Platform',
    url: 'https://atlan.com',
    detail:
      'Automated EKS control-plane and node upgrades with Argo Workflows (80% faster), synced secrets with External Secrets Operator, built Grafana dashboards and alerts that cut MTTD by 40%, and served on the platform on-call rotation.',
  },
  {
    when: 'Jan 2025 — Now',
    org: 'Kubeflow',
    role: 'Contributor · CNCF',
    url: 'https://github.com/kubeflow',
    detail:
      'Cascade deletion in the Pipelines backend, release automation for Kubeflow Trainer, and Release Shadow for Kubeflow Community Distribution 26.03.',
  },
  {
    when: 'Sep — Nov 2024',
    org: 'CNCF Thanos',
    role: 'LFX Mentee',
    url: 'https://thanos.io',
    detail:
      'Optimized request hedging in Thanos Store Gateway with adaptive T-Digest thresholds, cutting P99 tail latency by 30% — merged upstream as an opt-in production option.',
  },
];

/**
 * Homepage résumé data — roles and upstream contributions.
 *
 * Posts and projects come from content collections; these two lists are
 * short enough that a typed module beats a collection.
 */

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

export interface OssContribution {
  title: string;
  repo: string;
  url: string;
}

/** Real merged upstream PRs (see the "all merged" search link on the homepage). */
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

/** Last known count, used when the GitHub API is unreachable at build time. */
const OSS_COUNT_FALLBACK = 61;

/**
 * Number of merged upstream PRs, fetched once per build.
 * `GITHUB_TOKEN` (optional) just raises the anonymous rate limit.
 */
export async function fetchMergedPrCount(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.github.com/search/issues?per_page=1&q=' +
        encodeURIComponent('is:pr is:merged author:milinddethe15 -user:milinddethe15'),
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'milinddethe15.tech-build',
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      },
    );
    if (!res.ok) return OSS_COUNT_FALLBACK;
    const body = (await res.json()) as { total_count?: number };
    return body.total_count ?? OSS_COUNT_FALLBACK;
  } catch {
    return OSS_COUNT_FALLBACK;
  }
}

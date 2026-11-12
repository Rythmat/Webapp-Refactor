import { useMemo } from 'react';
import { MicroLabel } from '@/components/kit/MicroLabel';
import { CourseCover } from '@/components/learn/cover/CourseCover';
import {
  allCourses,
  buildLearnCatalog,
} from '@/features/learn/catalog/learnCatalog';
import { buildCover, clearCoverCache } from '@/lib/cover';

/**
 * Every Learn course's cover, as its card draws it, grouped by topic and
 * section; the Theory families again at the Continue hero's size, and the
 * strip's thumbnail. The review surface for the covers (owner, 2026-11-04).
 */
export function CourseCoverSheet() {
  const topics = useMemo(
    () =>
      buildLearnCatalog({
        enabled: () => true,
        isPremium: true,
        lessons: [],
        completedAt: {},
        genreReady: null,
      }),
    [],
  );
  const stats = useMemo(() => {
    clearCoverCache();
    const started = performance.now();
    let bytes = 0;
    let most = 0;
    for (const course of allCourses(topics)) {
      const scene = buildCover(course.cover);
      bytes += scene.bytes;
      most = Math.max(most, scene.bytes);
    }
    return { bytes, most, ms: performance.now() - started };
  }, [topics]);
  const theory = topics[0]?.sections.find((s) => s.id === 'theory');

  return (
    <section id="course-covers" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[1.375rem] text-white">Course covers</h2>
        <MicroLabel>
          {`${allCourses(topics).length} covers · ${(stats.bytes / 1024).toFixed(1)} KB · largest ${(stats.most / 1024).toFixed(1)} KB · ${stats.ms.toFixed(1)} ms`}
        </MicroLabel>
      </div>
      {topics.map((topic) => (
        <div key={topic.id} className="flex flex-col gap-5">
          <MicroLabel>{topic.title}</MicroLabel>
          {topic.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-3">
              <span className="text-[0.875rem] text-white/70">
                {section.title}
              </span>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-4 gap-y-6">
                {section.courses.map((course) => (
                  <li key={course.id} className="group flex flex-col gap-2">
                    <CourseCover
                      cover={course.cover}
                      title={course.kind === 'genre' ? course.title : undefined}
                      className="aspect-square w-full"
                    />
                    <span className="text-[0.875rem] font-bold text-white">
                      {course.title}
                    </span>
                    <span className="text-[0.75rem] text-white/45">
                      {course.cover.family}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
      {theory && (
        <div className="flex flex-col gap-3">
          <MicroLabel>Theory · Continue hero size, and the strip</MicroLabel>
          <div className="flex flex-wrap items-end gap-4">
            {theory.courses.slice(0, 3).map((course) => (
              <CourseCover
                key={course.id}
                cover={course.cover}
                detail="hero"
                stack={false}
                className="aspect-square w-[17rem]"
              />
            ))}
            {theory.courses.map((course) => (
              <CourseCover
                key={`${course.id}-strip`}
                cover={course.cover}
                stack={false}
                className="size-14"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

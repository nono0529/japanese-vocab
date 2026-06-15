/* ============================
   不背日语 — Vocabulary Seeding
   ============================ */

/**
 * Load vocabulary from JSON into IndexedDB on first launch.
 * Uses vocabularyVersion setting to detect vocabulary updates.
 * When version changes, clears old data and re-seeds.
 */
async function seedVocabularyIfNeeded() {
  let data;
  try {
    const response = await fetch('data/vocabulary.json');
    data = await response.json();
    const currentVersion = data.version || '1.0.0';
    const loadedVersion = await getSetting('vocabularyVersion', '');
    if (loadedVersion === currentVersion) {
      console.log('[Vocabulary] Already up to date (version ' + currentVersion + ')');
      return;
    }
    console.log('[Vocabulary] Version changed: ' + (loadedVersion || 'none') + ' -> ' + currentVersion);
  } catch (err) {
    console.error('[Vocabulary] Failed to fetch/check version:', err);
    return;
  }

  try {
    await db.transaction('rw', db.words, db.learningState, db.lessonProgress, db.settings, async () => {
      // Clear old vocabulary data for fresh seed
      await db.words.clear();
      await db.learningState.clear();
      await db.lessonProgress.clear();

      let totalWords = 0;

      for (const lesson of data.lessons) {
        let lessonWordCount = 0;

        for (const word of lesson.words) {
          // Insert word
          const wordId = await db.words.put({
            lessonId: lesson.id,
            wordIndex: word.index,
            japanese: word.japanese,
            reading: word.reading,
            meaning: word.meaning,
            partOfSpeech: word.partOfSpeech || '名詞',
            exampleSentence: word.exampleSentence || '',
            exampleReading: word.exampleReading || '',
            exampleMeaning: word.exampleMeaning || ''
          });

          // Create initial learning state
          await db.learningState.put({
            wordId,
            status: 'new',
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: '',
            lastReviewDate: '',
            lapses: 0,
            lessonId: lesson.id
          });

          lessonWordCount++;
          totalWords++;
        }

        // Set lesson progress
        await db.lessonProgress.put({
          lessonId: lesson.id,
          totalWords: lessonWordCount,
          learnedWords: 0,
          completed: false
        });
      }

      // Save version to prevent re-seeding
      await db.settings.put({ key: 'vocabularyVersion', value: data.version || '1.0.0' });
      console.log('[Vocabulary] Seeded ' + totalWords + ' words across ' + data.lessons.length + ' lessons.');
    });

  } catch (err) {
    console.error('[Vocabulary] Failed to seed vocabulary:', err);
  }
}

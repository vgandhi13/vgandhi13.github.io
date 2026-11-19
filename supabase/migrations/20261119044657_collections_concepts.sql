alter table public.collection_entries
  drop constraint collection_entries_collection_check,
  add constraint collection_entries_collection_check check (collection in (
    'philosophy', 'firstPrinciples', 'philosophyNotes', 'ideas', 'history',
    'psychology', 'neuroscience', 'learnings', 'thoughts', 'inspiration',
    'finance', 'social-sciences', 'concepts'
  ));

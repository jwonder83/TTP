-- Built-in exercises. Safe to run more than once.

insert into public.exercises (name, category, exercise_type, equipment, default_rest_seconds, is_custom, user_id)
select v.name, v.category, v.exercise_type, v.equipment, v.default_rest_seconds, false, null
from (
  values
    ('Bench Press', 'chest', 'compound', 'barbell', 180),
    ('Incline Bench Press', 'chest', 'compound', 'barbell', 180),
    ('Dumbbell Bench Press', 'chest', 'accessory', 'dumbbell', 90),
    ('Weighted Dip', 'chest', 'compound', 'bodyweight', 180),
    ('Chest Press', 'chest', 'compound', 'machine', 120),
    ('Cable Fly', 'chest', 'accessory', 'cable', 90),
    ('Deadlift', 'back', 'compound', 'barbell', 180),
    ('Pull Up', 'back', 'compound', 'bodyweight', 180),
    ('Weighted Pull Up', 'back', 'compound', 'bodyweight', 180),
    ('Barbell Row', 'back', 'compound', 'barbell', 120),
    ('Lat Pulldown', 'back', 'accessory', 'cable', 90),
    ('Seated Cable Row', 'back', 'accessory', 'cable', 90),
    ('Squat', 'leg', 'compound', 'barbell', 180),
    ('Front Squat', 'leg', 'compound', 'barbell', 180),
    ('Romanian Deadlift', 'leg', 'compound', 'barbell', 120),
    ('Leg Press', 'leg', 'compound', 'machine', 120),
    ('Leg Extension', 'leg', 'accessory', 'machine', 90),
    ('Leg Curl', 'leg', 'accessory', 'machine', 90),
    ('Overhead Press', 'shoulder', 'compound', 'barbell', 180),
    ('Dumbbell Shoulder Press', 'shoulder', 'accessory', 'dumbbell', 90),
    ('Lateral Raise', 'shoulder', 'accessory', 'dumbbell', 90),
    ('Rear Delt Fly', 'shoulder', 'accessory', 'dumbbell', 90),
    ('Barbell Curl', 'arms', 'accessory', 'barbell', 90),
    ('Dumbbell Curl', 'arms', 'accessory', 'dumbbell', 90),
    ('Hammer Curl', 'arms', 'accessory', 'dumbbell', 90),
    ('Triceps Extension', 'arms', 'accessory', 'cable', 90),
    ('Skull Crusher', 'arms', 'accessory', 'barbell', 90)
) as v(name, category, exercise_type, equipment, default_rest_seconds)
where not exists (
  select 1
  from public.exercises e
  where e.user_id is null
    and lower(e.name) = lower(v.name)
);

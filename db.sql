DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
   id SERIAL primary key,
   firstname VARCHAR(255) not null,
   lastname VARCHAR(255) not null,
   email VARCHAR(255) not null UNIQUE,
   password VARCHAR(255) not null,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    signature TEXT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles(
    id SERIAL PRIMARY KEY,
    age VARCHAR(10),
    city VARCHAR(250),
    url TEXT,
    user_id INTEGER NOT NULL
);

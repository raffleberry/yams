CREATE USER 'yams'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'yams';
CREATE DATABASE yams;
GRANT ALL PRIVILEGES ON yams.* TO 'yams'@'localhost';

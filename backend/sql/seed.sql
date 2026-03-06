INSERT INTO books (id, title, author, description) VALUES
('b1', 'Deep Learning with Python', 'Francois Chollet', 'Practical deep learning guide.'),
('b2', 'Hands-On Machine Learning', 'Aurelien Geron', 'Machine learning with scikit-learn and pytorch.'),
('b3', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'System design and distributed data.'),
('b4', 'Clean Code', 'Robert C. Martin', 'Code quality and software craftsmanship.'),
('b5', 'The Pragmatic Programmer', 'Andrew Hunt', 'Practical engineering wisdom.'),
('b6', 'Recommender Systems Handbook', 'Ricci', 'Academic and practical recommendation techniques.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_events (user_id, book_id, event_type) VALUES
('u1', 'b1', 'borrow'), ('u1', 'b2', 'click'), ('u1', 'b3', 'borrow'),
('u2', 'b2', 'borrow'), ('u2', 'b4', 'click'),
('u3', 'b3', 'borrow'), ('u3', 'b5', 'borrow'),
('u4', 'b4', 'click'), ('u4', 'b5', 'borrow'), ('u4', 'b6', 'borrow')
ON CONFLICT DO NOTHING;

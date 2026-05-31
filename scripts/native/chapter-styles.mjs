export const CHAPTER_STYLES = `
.am-cluster-lead {
  font-size: 1.05rem;
}

.am-cluster-card-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin: 1rem 0;
}

.am-cluster-card,
.am-cluster-box {
  border: 1px solid #d5dbe3;
  border-radius: 14px;
  padding: 1rem;
  background: #f8fafc;
}

.am-cluster-card h4,
.am-cluster-box h4 {
  margin-top: 0;
}

.am-cluster-note {
  color: #31475f;
  font-style: italic;
}

.am-cluster-emoji-line {
  font-size: 1.55rem;
  letter-spacing: 0.08em;
}

.am-cluster-reveal {
  border: 1px solid #d6e2ed;
  border-radius: 14px;
  background: #f8fbfe;
  padding: 0.85rem 1rem;
}

.am-cluster-reveal summary {
  cursor: pointer;
  font-weight: 600;
}

.am-cluster-reveal p {
  margin-bottom: 0;
}

.am-cluster-formula {
  margin: 0.5rem 0;
  text-align: center;
}

.am-cluster-formula-scroll {
  width: 100%;
  overflow-x: auto;
}

.am-cluster-formula math {
  display: block;
  font-size: 1.8rem;
  line-height: 1.35;
  width: max-content;
  max-width: 100%;
  margin: 0 auto;
}

.am-cluster-formula-label {
  margin: 0.75rem 0 0.35rem;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}

.am-cluster-formula-secondary {
  margin-top: 0.2rem;
}

.am-cluster-formula-secondary math {
  font-size: 1.45rem;
}

@media (max-width: 720px) {
  .am-cluster-formula math {
    font-size: 1.35rem;
  }

  .am-cluster-formula-secondary math {
    font-size: 1.15rem;
  }
}

.am-cluster-inline-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.am-cluster-inline-table th,
.am-cluster-inline-table td {
  border: 1px solid #d6e2ed;
  padding: 0.55rem 0.7rem;
  text-align: left;
}
`;

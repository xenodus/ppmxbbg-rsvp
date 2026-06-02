import { FAQ } from "../faqContent.js";

function FaqParagraph({ paragraph }) {
  if (typeof paragraph === "string") {
    return <p className="faq-answer">{paragraph}</p>;
  }

  if (paragraph.type === "text-with-link") {
    return (
      <p className="faq-answer">
        {paragraph.before}
        <a href={paragraph.href} target="_blank" rel="noopener noreferrer">
          {paragraph.linkText}
        </a>
        {paragraph.after}
      </p>
    );
  }

  if (paragraph.type === "contact") {
    return (
      <p className="faq-answer">
        {paragraph.before}
        <a href={`tel:+65${paragraph.alvinPhone}`}>{paragraph.alvinDisplay}</a>
        {paragraph.middle}
        <a href={`tel:+65${paragraph.vivianPhone}`}>{paragraph.vivianDisplay}</a>
        {paragraph.after}
      </p>
    );
  }

  return null;
}

function FaqItem({ item }) {
  return (
    <article className="faq-item">
      <h4 className="faq-question">{item.question}</h4>
      {item.paragraphs.map((paragraph, index) => (
        <FaqParagraph key={index} paragraph={paragraph} />
      ))}
      {item.list && (
        <ul className="faq-list">
          {item.list.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function Faq() {
  return (
    <section id="faq" className="faq-card" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="card-title">
        {FAQ.pageTitle}
      </h2>

      {FAQ.sections.map((section) => (
        <div key={section.title} className="faq-section">
          <h3 className="faq-section-title">{section.title}</h3>
          {section.items.map((item) => (
            <FaqItem key={item.question} item={item} />
          ))}
        </div>
      ))}
    </section>
  );
}

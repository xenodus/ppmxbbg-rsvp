import { GETTING_THERE } from "../gettingThereContent.js";

function DetailLine({ line }) {
  if (line.type === "link") {
    return (
      <p className="faq-answer">
        <span className="faq-detail-label">{line.label}</span>{" "}
        <a href={line.href} target="_blank" rel="noopener noreferrer">
          {line.linkText}
        </a>
      </p>
    );
  }

  return (
    <p className="faq-answer">
      <span className="faq-detail-label">{line.label}</span> {line.text}
    </p>
  );
}

function AdventureOption({ option }) {
  return (
    <article className="faq-item">
      <h4 className="faq-question">{option.title}</h4>
      {option.lines?.map((line) => (
        <DetailLine key={line.label} line={line} />
      ))}
      {option.note && <p className="faq-answer">{option.note}</p>}
      {option.routes?.map((route) => (
        <div key={route.title} className="getting-there-route">
          <h5 className="getting-there-route-title">{route.title}</h5>
          <p className="faq-detail-label getting-there-route-label">The Route:</p>
          <ol className="faq-list getting-there-steps">
            {route.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ))}
    </article>
  );
}

function GettingThereBody({ embedded = false }) {
  const { adventure, wetWeather } = GETTING_THERE;

  return (
    <>
      {!embedded && (
        <h2 id="getting-there-heading" className="card-title">
          {GETTING_THERE.pageTitle}
        </h2>
      )}
      <p className="card-intro">{GETTING_THERE.intro}</p>

      <div className="faq-section">
        <h3 className="faq-section-title">{adventure.title}</h3>
        {adventure.options.map((option) => (
          <AdventureOption key={option.title} option={option} />
        ))}
      </div>

      <div className="faq-section">
        <h3 className="faq-section-title">{wetWeather.title}</h3>
        {wetWeather.paragraphs.map((paragraph) => (
          <p key={paragraph} className="faq-answer">
            {paragraph}
          </p>
        ))}
      </div>
    </>
  );
}

export default function GettingThere({ embedded = false }) {
  if (embedded) {
    return (
      <div
        className="faq-card landing-getting-there-card"
        aria-label="Getting to the wedding"
      >
        <GettingThereBody embedded />
      </div>
    );
  }

  return (
    <section
      id="getting-there"
      className="faq-card"
      aria-labelledby="getting-there-heading"
    >
      <GettingThereBody />
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Stay connected with the QAForge project.</p>
          <ul>
            <li>
              <a href="https://github.com/Morenoe03/QAForge" target="_blank" rel="noopener noreferrer">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/emanuelmoreno1/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/linkedin-logo.png" alt="LinkedIn" className="button-icon" />
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

import { Link } from "react-router-dom";
import { Eyes, Starburst } from "../components/Decor";

export default function NotFound() {
  return (
    <section className="notfound wrap">
      <Starburst size={160} color="var(--orange)" ink="var(--cream)">
        <b>404</b>
      </Starburst>
      <h1 className="display">This plate is empty</h1>
      <p>The page you're looking for isn't on the menu.</p>
      <Eyes />
      <Link to="/" className="btn btn--orange">Back to kitchens</Link>
    </section>
  );
}

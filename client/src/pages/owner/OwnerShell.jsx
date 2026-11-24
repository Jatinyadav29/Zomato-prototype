import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { restaurantsApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthProvider";
import { photoFor } from "../../lib/constants";
import { Checker } from "../../components/Decor";
import { IconBack, IconChart, IconEdit, IconList, IconPin, IconStore } from "../../components/Icons";
import { ErrorState, PageLoader } from "../../components/States";

export default function OwnerShell() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["restaurant", id], queryFn: () => restaurantsApi.get(id) });
  if (isLoading) return <PageLoader label="Opening your kitchen" />;
  if (error) return <div className="wrap section"><ErrorState error={error} onRetry={refetch} /></div>;
  const r = data.restaurant;
  const mine = (r.owner?._id || r.owner) === user.id;
  if (!mine)
    return (
      <div className="wrap section">
        <ErrorState error={{ status: 403, message: "This kitchen belongs to another owner." }} />
      </div>
    );

  return (
    <div className="owner-shell">
      <section className="owner-band">
        <div className="wrap owner-band__inner">
          <img src={photoFor(r)} alt="" className="owner-band__photo" />
          <div className="owner-band__copy">
            <Link to="/owner" className="back-link back-link--light"><IconBack width={16} height={16} /> All my kitchens</Link>
            <h1 className="display">{r.name}</h1>
            <p>
              <IconPin width={15} height={15} /> {[r.area, r.city].filter(Boolean).join(", ")} · {r.cuisines.join(" · ")}
              <span className={`status-pill ${r.isOpen ? "status-pill--open" : "status-pill--closed"}`}>{r.isOpen ? "Open" : "Closed"}</span>
            </p>
          </div>
          <Link to={`/r/${r._id}`} className="btn btn--cream btn--sm owner-band__public">See public page</Link>
        </div>
        <nav className="owner-tabs wrap" aria-label="Kitchen sections">
          <NavLink end to={`/owner/${id}`}><IconChart width={18} height={18} /> Dashboard</NavLink>
          <NavLink to={`/owner/${id}/orders`}><IconList width={18} height={18} /> Orders</NavLink>
          <NavLink to={`/owner/${id}/menu`}><IconStore width={18} height={18} /> Menu</NavLink>
          <NavLink to={`/owner/${id}/edit`}><IconEdit width={18} height={18} /> Details</NavLink>
        </nav>
        <Checker color="var(--green)" size={14} className="owner-band__checker" />
      </section>
      <div className="wrap owner-content">
        <Outlet context={{ restaurant: r }} />
      </div>
    </div>
  );
}

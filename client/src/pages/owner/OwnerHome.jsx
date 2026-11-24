import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { restaurantsApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthProvider";
import { photoFor, tintFor } from "../../lib/constants";
import { Scribble } from "../../components/Decor";
import { IconChart, IconList, IconPin, IconPlus, IconStore } from "../../components/Icons";
import { Empty, ErrorState, Skeleton } from "../../components/States";
import { toast } from "../../components/toast";

function OpenToggle({ r }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => restaurantsApi.update(r._id, { isOpen: !r.isOpen }),
    onSuccess: ({ restaurant }) => {
      qc.setQueryData(["my-restaurants"], (d) => d && { ...d, restaurants: d.restaurants.map((x) => (x._id === restaurant._id ? restaurant : x)) });
      qc.invalidateQueries({ queryKey: ["restaurant", restaurant._id] });
      toast(`${restaurant.name} is now ${restaurant.isOpen ? "open" : "closed"}`);
    },
    onError: (e) => toast(e.message, "red"),
  });
  return (
    <button className={`switch ${r.isOpen ? "is-on" : ""}`} onClick={() => m.mutate()} disabled={m.isPending} role="switch" aria-checked={r.isOpen} aria-label={`${r.name} open for orders`}>
      <span className="switch__track"><span className="switch__thumb" /></span>
      <span>{r.isOpen ? "Open" : "Closed"}</span>
    </button>
  );
}

export default function OwnerHome() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["my-restaurants"], queryFn: restaurantsApi.mine });
  const list = data?.restaurants || [];
  const open = list.filter((r) => r.isOpen).length;

  return (
    <section className="owner-home wrap">
      <div className="owner-home__head">
        <div>
          <p className="hand owner-home__hi">hey {user?.name?.split(" ")[0]},</p>
          <h1 className="display">Your kitchens</h1>
          {data && (
            <p className="muted">
              {list.length} kitchens · {open} open right now
            </p>
          )}
        </div>
        <Link to="/owner/new" className="btn btn--orange">
          <IconPlus width={18} height={18} /> Open a new kitchen
        </Link>
      </div>
      {error && <ErrorState error={error} onRetry={refetch} />}
      <div className="kitchen-grid">
        {isLoading && Array.from({ length: 6 }, (_, i) => <div key={i} className="kitchen"><Skeleton h={160} r={18} /><Skeleton h={22} w="60%" style={{ marginTop: 16 }} /></div>)}
        {list.map((r) => (
          <article key={r._id} className={`kitchen ${r.isOpen ? "" : "kitchen--closed"}`} style={{ "--tint": tintFor(r) }}>
            <Link to={`/owner/${r._id}`} className="kitchen__media">
              <img src={photoFor(r)} alt="" loading="lazy" />
            </Link>
            <div className="kitchen__body">
              <div className="kitchen__top">
                <h2 className="display"><Link to={`/owner/${r._id}`}>{r.name}</Link></h2>
                <OpenToggle r={r} />
              </div>
              <p className="kitchen__where"><IconPin width={15} height={15} /> {[r.area, r.city].filter(Boolean).join(", ")}</p>
              <p className="kitchen__cuisines">{r.cuisines.join(" · ")}</p>
              <nav className="kitchen__links">
                <Link to={`/owner/${r._id}`}><IconChart width={16} height={16} /> Dashboard</Link>
                <Link to={`/owner/${r._id}/orders`}><IconList width={16} height={16} /> Orders</Link>
                <Link to={`/owner/${r._id}/menu`}><IconStore width={16} height={16} /> Menu</Link>
              </nav>
            </div>
          </article>
        ))}
      </div>
      {data && !list.length && <Empty title="No kitchens yet" text="Open your first kitchen and start taking orders." action={{ to: "/owner/new", label: "Open a kitchen" }} />}
      {data && list.length > 0 && <Scribble arrow="down-left" className="owner-home__scribble">flip the switch to open or close</Scribble>}
    </section>
  );
}

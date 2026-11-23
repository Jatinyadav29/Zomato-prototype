import { Link } from "react-router-dom";
import { photoFor, tintFor } from "../lib/constants";
import { IconArrow, IconPin } from "./Icons";
import { Starburst } from "./Decor";
import { Skeleton } from "./States";

export default function RestaurantCard({ restaurant, badge, to, featured = false }) {
  const r = restaurant;
  return (
    <Link to={to || `/r/${r._id}`} className={`rcard ${r.isOpen ? "" : "rcard--closed"} ${featured ? "rcard--featured" : ""}`} style={{ "--tint": tintFor(r) }}>
      <div className="rcard__media">
        <img src={photoFor(r)} alt="" loading="lazy" />
        {badge && <span className="rcard__badge">{badge}</span>}
        {featured && (
          <Starburst className="rcard__burst" size={92} color="var(--yellow)" rotate={-12}>
            Try
            <br />
            this
          </Starburst>
        )}
        {!r.isOpen && <span className="rcard__closed">Closed now</span>}
      </div>
      <div className="rcard__body">
        <h3 className="rcard__name">{r.name}</h3>
        {featured && <p className="rcard__pitch hand">today's lucky dip in {r.area || r.city}</p>}
        <p className="rcard__area">
          <IconPin width={15} height={15} />
          {[r.area, r.city].filter(Boolean).join(", ")}
        </p>
        <div className="rcard__foot">
          <span className="rcard__cuisines">{r.cuisines?.slice(0, 3).join(" · ") || "Kitchen"}</span>
          <span className="rcard__go" aria-hidden="true">
            Menu <IconArrow width={16} height={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="rcard rcard--skeleton" aria-hidden="true">
      <div className="rcard__media">
        <Skeleton h="100%" r={0} />
      </div>
      <div className="rcard__body">
        <Skeleton h={22} w="70%" />
        <Skeleton h={14} w="45%" style={{ marginTop: 10 }} />
        <Skeleton h={14} w="60%" style={{ marginTop: 18 }} />
      </div>
    </div>
  );
}

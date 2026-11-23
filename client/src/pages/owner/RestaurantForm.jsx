import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantsApi } from "../../api/endpoints";
import { CITIES, CITY_NAMES, CUISINES } from "../../lib/constants";
import { Scribble } from "../../components/Decor";
import { ErrorState, Spinner } from "../../components/States";
import { toast } from "../../components/toast";

function initialFrom(r) {
  if (!r) {
    const c = CITIES.Bhopal;
    return { name: "", city: "Bhopal", area: c.areas[0], cuisines: [], lng: c.lng, lat: c.lat, isOpen: true };
  }
  return { name: r.name, city: r.city, area: r.area || "", cuisines: r.cuisines, lng: r.location.coordinates[0], lat: r.location.coordinates[1], isOpen: r.isOpen };
}

export default function RestaurantForm() {
  const ctx = useOutletContext();
  const existing = ctx?.restaurant;
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState(() => initialFrom(existing));
  const orig = initialFrom(existing);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: f.name.trim(), city: f.city, area: f.area, cuisines: f.cuisines, isOpen: f.isOpen };
      const moved = Number(f.lng) !== Number(orig.lng) || Number(f.lat) !== Number(orig.lat);
      if (!existing || moved) Object.assign(body, { lng: Number(f.lng), lat: Number(f.lat) });
      return existing ? restaurantsApi.update(existing._id, body) : restaurantsApi.create(body);
    },
    onSuccess: ({ restaurant }) => {
      qc.invalidateQueries({ queryKey: ["my-restaurants"] });
      qc.setQueryData(["restaurant", restaurant._id], (d) => ({ restaurant: { ...restaurant, owner: d?.restaurant?.owner || restaurant.owner } }));
      toast(existing ? "Saved" : `${restaurant.name} is live`);
      nav(`/owner/${restaurant._id}`);
    },
  });
  const del = useMutation({
    mutationFn: () => restaurantsApi.remove(existing._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-restaurants"] });
      toast("Kitchen deleted");
      nav("/owner");
    },
  });

  const pickCity = (city) => {
    const c = CITIES[city];
    setF({ ...f, city, area: c.areas[0], lng: c.lng, lat: c.lat });
  };
  const toggleCuisine = (c) => setF({ ...f, cuisines: f.cuisines.includes(c) ? f.cuisines.filter((x) => x !== c) : [...f.cuisines, c] });

  return (
    <section className={`rform ${existing ? "" : "wrap rform--new"}`}>
      <div className="rform__head">
        <h2 className="display">{existing ? "Kitchen details" : "Open a new kitchen"}</h2>
        {!existing && <Scribble arrow="down-right">let's get cooking</Scribble>}
      </div>
      <form
        className="form rform__form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="field">
          <span>Kitchen name</span>
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Sharma Ji Ki Rasoi" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>City</span>
            <select value={f.city} onChange={(e) => pickCity(e.target.value)}>
              {CITY_NAMES.concat(CITY_NAMES.includes(f.city) ? [] : [f.city]).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Area</span>
            <select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>
              {(CITIES[f.city]?.areas || []).concat(CITIES[f.city]?.areas.includes(f.area) || !f.area ? [] : [f.area]).map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="field">
          <span>Cuisines</span>
          <div className="chips">
            {CUISINES.map((c) => (
              <button type="button" key={c} className={`chip ${f.cuisines.includes(c) ? "is-active" : ""}`} aria-pressed={f.cuisines.includes(c)} onClick={() => toggleCuisine(c)}>{c}</button>
            ))}
          </div>
        </fieldset>
        <div className="field-row">
          <label className="field">
            <span>Longitude</span>
            <input type="number" step="any" min={-180} max={180} required value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
          </label>
          <label className="field">
            <span>Latitude</span>
            <input type="number" step="any" min={-90} max={90} required value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
          </label>
        </div>
        <p className="muted small">Picking a city fills in its centre. Fine-tune the pin if you know your exact spot.</p>
        <label className="check"><input type="checkbox" checked={f.isOpen} onChange={(e) => setF({ ...f, isOpen: e.target.checked })} /> Open for orders</label>
        {save.error && <ErrorState error={save.error} compact />}
        <div className="rform__actions">
          <button className="btn btn--orange" disabled={save.isPending}>{save.isPending && <Spinner size={18} />}{existing ? "Save changes" : "Open kitchen"}</button>
          {existing && (
            <button type="button" className="btn btn--ghost btn--danger" disabled={del.isPending} onClick={() => window.confirm(`Delete ${existing.name}? Its menu goes too. Orders and reviews are kept.`) && del.mutate()}>
              Delete kitchen
            </button>
          )}
        </div>
        {del.error && <ErrorState error={del.error} compact />}
      </form>
    </section>
  );
}

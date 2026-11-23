import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "../../api/endpoints";
import { CATEGORIES, dishPhoto, formatINR } from "../../lib/constants";
import { VegMark } from "../../components/Decor";
import { IconEdit, IconPlus, IconTrash } from "../../components/Icons";
import Modal from "../../components/Modal";
import { ErrorState, Skeleton, Spinner } from "../../components/States";
import { toast } from "../../components/toast";

const BLANK = { name: "", category: "Main Course", price: "", isVeg: true, isAvailable: true };

function ItemForm({ initial, onSubmit, busy, error, submitLabel }) {
  const [f, setF] = useState(initial);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...f, price: Number(f.price) });
      }}
    >
      <label className="field">
        <span>Dish name</span>
        <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Paneer Tikka" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Category</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.concat(CATEGORIES.includes(f.category) ? [] : [f.category]).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Price (₹)</span>
          <input required type="number" min={0} step={5} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </label>
      </div>
      <div className="field-row field-row--checks">
        <label className="check"><input type="checkbox" checked={f.isVeg} onChange={(e) => setF({ ...f, isVeg: e.target.checked })} /> Vegetarian</label>
        <label className="check"><input type="checkbox" checked={f.isAvailable} onChange={(e) => setF({ ...f, isAvailable: e.target.checked })} /> Available today</label>
      </div>
      {error && <ErrorState error={error} compact />}
      <button className="btn btn--orange btn--block" disabled={busy}>{busy ? <Spinner size={18} /> : null}{submitLabel}</button>
    </form>
  );
}

function Row({ item, id }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const thumb = dishPhoto(`${item.category} ${item.name}`);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["menu", id] });
  };
  const patch = useMutation({
    mutationFn: (body) => menuApi.update(id, item._id, body),
    onSuccess: ({ menuItem }) => {
      qc.setQueryData(["menu", id, "manage"], (d) => d && { ...d, menuItems: d.menuItems.map((m) => (m._id === menuItem._id ? menuItem : m)) });
      refresh();
      setEditing(false);
    },
    onError: (e) => toast(e.message, "red"),
  });
  const del = useMutation({
    mutationFn: () => menuApi.remove(id, item._id),
    onSuccess: () => {
      qc.setQueryData(["menu", id, "manage"], (d) => d && { ...d, count: d.count - 1, menuItems: d.menuItems.filter((m) => m._id !== item._id) });
      refresh();
      toast(`${item.name} removed`);
    },
    onError: (e) => toast(e.message, "red"),
  });
  return (
    <li className={`mm-row ${item.isAvailable ? "" : "is-off"}`}>
      {thumb ? (
        <img className="mm-row__thumb" src={thumb} alt="" loading="lazy" />
      ) : (
        <span className={`mm-row__thumb mm-row__thumb--tile ${item.isVeg ? "is-veg" : ""}`} aria-hidden="true">{item.name.slice(0, 1)}</span>
      )}
      <VegMark veg={item.isVeg} />
      <b className="mm-row__name">{item.name}</b>
      <span className="mm-row__price">{formatINR(item.price)}</span>
      <button className={`switch switch--sm ${item.isAvailable ? "is-on" : ""}`} role="switch" aria-checked={item.isAvailable} aria-label={`${item.name} available`} disabled={patch.isPending} onClick={() => patch.mutate({ isAvailable: !item.isAvailable })}>
        <span className="switch__track"><span className="switch__thumb" /></span>
        <span>{item.isAvailable ? "In stock" : "Sold out"}</span>
      </button>
      <button className="icon-btn" onClick={() => setEditing(true)} aria-label={`Edit ${item.name}`}><IconEdit width={18} height={18} /></button>
      <button className="icon-btn icon-btn--danger" disabled={del.isPending} onClick={() => window.confirm(`Delete ${item.name}?`) && del.mutate()} aria-label={`Delete ${item.name}`}><IconTrash width={18} height={18} /></button>
      {editing && (
        <Modal open onClose={() => setEditing(false)} title="Edit dish">
          <ItemForm initial={{ ...item, price: String(item.price) }} busy={patch.isPending} error={patch.error} submitLabel="Save changes" onSubmit={({ name, category, price, isVeg, isAvailable }) => patch.mutate({ name, category, price, isVeg, isAvailable })} />
        </Modal>
      )}
    </li>
  );
}

export default function MenuManager() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");
  const q = useQuery({ queryKey: ["menu", id, "manage"], queryFn: () => menuApi.list(id) });
  const create = useMutation({
    mutationFn: (body) => menuApi.create(id, body),
    onSuccess: ({ menuItem }) => {
      qc.invalidateQueries({ queryKey: ["menu", id] });
      setAdding(false);
      toast(`${menuItem.name} added to the menu`);
    },
  });

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of q.data?.menuItems || []) {
      if (filter && !it.name.toLowerCase().includes(filter.toLowerCase())) continue;
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category).push(it);
    }
    return [...map.entries()];
  }, [q.data, filter]);
  const off = (q.data?.menuItems || []).filter((m) => !m.isAvailable).length;

  return (
    <div className="mm">
      <div className="mm__head">
        <div>
          <h2 className="display">Menu</h2>
          {q.data && <p className="muted">{q.data.count} dishes · {off} sold out</p>}
        </div>
        <div className="mm__tools">
          <input className="input" placeholder="Find a dish" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find a dish" />
          <button className="btn btn--orange" onClick={() => setAdding(true)}><IconPlus width={18} height={18} /> Add dish</button>
        </div>
      </div>
      {q.error && <ErrorState error={q.error} onRetry={q.refetch} />}
      {q.isLoading && <div className="mm__cols"><Skeleton h={300} r={20} /><Skeleton h={300} r={20} /></div>}
      <div className="mm__cols">
        {groups.map(([cat, items], i) => (
          <section key={cat} className={`mm-block ${i % 3 === 1 ? "mm-block--green" : ""}`}>
            <h3 className="display">{cat}</h3>
            <ul>{items.map((it) => <Row key={it._id} item={it} id={id} />)}</ul>
          </section>
        ))}
      </div>
      {q.data && !groups.length && <p className="muted center">No dishes{filter ? " match that name" : " yet"}.</p>}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a dish">
        <ItemForm initial={BLANK} busy={create.isPending} error={create.error} submitLabel="Add to menu" onSubmit={(b) => create.mutate(b)} />
      </Modal>
    </div>
  );
}

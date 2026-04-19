import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const QUARTER_MONTHS = {
  Q1: ["Jan","Feb","Mar"],
  Q2: ["Apr","May","Jun"],
  Q3: ["Jul","Aug","Sep"],
  Q4: ["Oct","Nov","Dec"],
};

const AVAILABLE_QUARTERS = ["Q1","Q2","Q3","Q4"];
const DISPLAY_YEAR = 2026;

function safeNum(v){ return Number(v)||0 }
function fmtUSD(v){ return `$${Math.round(v||0).toLocaleString()}` }

function getQuarterDateRange(q,m){
  const months = m ? [m] : QUARTER_MONTHS[q];
  const idx = months.map(x=>MONTHS.indexOf(x));
  const start = new Date(Date.UTC(DISPLAY_YEAR, Math.min(...idx),1));
  const end = new Date(Date.UTC(DISPLAY_YEAR, Math.max(...idx)+1,0,23,59,59));
  return { startIso:start.toISOString(), endIso:end.toISOString() }
}

function parseDate(v){ return v?new Date(v):null }

function buildRows(rows){
  return (rows||[]).map((r,i)=>({
    id:r.deal_id||r.lead_id||i,
    company:r.company||r.deal_name||"-",
    country:r.country||"-",
    geo:r.country||"-",
    campaign:r.campaign_name||r.utm_campaign||"-",
    closeDate:r.close_date?.slice(0,10),
    closeRaw:parseDate(r.close_date),
    created:r.lead_created_date?.slice(0,10),
    createdRaw:parseDate(r.lead_created_date),
    value:safeNum(r.amount_usd),
    stage:r.deal_stage||"Closed Won",
    hs:r.deal_link||"#"
  }))
}

function sortRows(rows,key,dir){
  return [...rows].sort((a,b)=>{
    let x=a[key], y=b[key];
    if(key==="closeDate") x=a.closeRaw?.getTime()||0, y=b.closeRaw?.getTime()||0;
    if(key==="created") x=a.createdRaw?.getTime()||0, y=b.createdRaw?.getTime()||0;
    if(key==="value") x=a.value, y=b.value;
    if(typeof x==="string") x=x.toLowerCase(), y=y.toLowerCase();
    return dir==="asc" ? (x>y?1:-1) : (x<y?1:-1);
  })
}

export default function ClosurePage(){

  const [q,setQ]=useState("Q2")
  const [m,setM]=useState(null)
  const [rows,setRows]=useState([])
  const [sortKey,setSortKey]=useState("closeDate")
  const [sortDir,setSortDir]=useState("desc")

  useEffect(()=>{
    async function fetchData(){
      const {startIso,endIso}=getQuarterDateRange(q,m)

      const {data}=await supabase
        .from("master_leads")
        .select(`
          lead_id,deal_id,company,country,
          campaign_name,utm_campaign,
          lead_created_date,
          is_closed_won,close_date,
          amount_usd,deal_stage,
          deal_name,deal_link
        `)
        .eq("is_closed_won",true)
        .gte("close_date",startIso)
        .lte("close_date",endIso)

      setRows(buildRows(data))
    }
    fetchData()
  },[q,m])

  const displayRows = useMemo(()=>sortRows(rows,sortKey,sortDir),[rows,sortKey,sortDir])

  const total = displayRows.length
  const value = displayRows.reduce((s,r)=>s+r.value,0)
  const avg = total?value/total:0

  const handleSort=(k)=>{
    if(sortKey===k) setSortDir(d=>d==="asc"?"desc":"asc")
    else { setSortKey(k); setSortDir(k==="value"?"desc":"asc") }
  }

  const SortTh=({k,label})=>(
    <th onClick={()=>handleSort(k)}>
      {label} {sortKey===k?(sortDir==="asc"?"▲":"▼"):""}
    </th>
  )

  return (
    <div className="page">

      <h2>Closure Data</h2>

      {/* Filters */}
      <div>
        {AVAILABLE_QUARTERS.map(x=>(
          <button onClick={()=>{setQ(x);setM(null)}}>{x}</button>
        ))}
        {QUARTER_MONTHS[q].map(x=>(
          <button onClick={()=>setM(m===x?null:x)}>{x}</button>
        ))}
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div>🔒 Closures: {total}</div>
        <div>💰 Value: {fmtUSD(value)}</div>
        <div>📊 Avg Deal: {fmtUSD(avg)}</div>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <SortTh k="company" label="Company"/>
            <SortTh k="country" label="Country"/>
            <SortTh k="campaign" label="Campaign"/>
            <SortTh k="closeDate" label="Close Date"/>
            <SortTh k="created" label="Created"/>
            <SortTh k="value" label="Deal Value"/>
            <th>Stage</th>
            <th>HubSpot</th>
          </tr>
        </thead>

        <tbody>
          {displayRows.map((r,i)=>(
            <tr key={r.id}>
              <td>{i+1}</td>
              <td>{r.company}</td>
              <td>{r.country}</td>
              <td>{r.campaign}</td>
              <td>{r.closeDate}</td>
              <td>{r.created}</td>
              <td>{fmtUSD(r.value)}</td>
              <td>{r.stage}</td>
              <td><a href={r.hs}>↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}

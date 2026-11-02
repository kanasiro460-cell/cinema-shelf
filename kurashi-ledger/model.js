(function(root){
'use strict';
const categories=[
{id:'food',name:'食費',icon:'food',color:'#70977e',bg:'#edf3e8',type:'expense'},
{id:'home',name:'住居費',icon:'home',color:'#aebfa0',bg:'#f0f4ea',type:'expense'},
{id:'utilities',name:'水道・光熱費',icon:'sun',color:'#d4ba8d',bg:'#f8f3e7',type:'expense'},
{id:'daily',name:'日用品',icon:'bag',color:'#a0b7ae',bg:'#eef4f0',type:'expense'},
{id:'transport',name:'交通・通信費',icon:'train',color:'#a5b8c2',bg:'#edf2f5',type:'expense'},
{id:'health',name:'医療・保険',icon:'heart',color:'#d6ad9d',bg:'#fbf0e9',type:'expense'},
{id:'fun',name:'趣味・交際費',icon:'coffee',color:'#c0b2c8',bg:'#f4eff6',type:'expense'},
{id:'education',name:'教育・学び',icon:'book',color:'#b7bd8f',bg:'#f3f4e9',type:'expense'},
{id:'investment',name:'投資関連',icon:'wallet',color:'#9382b2',bg:'#f1edf8',type:'expense'},
{id:'smartphone',name:'スマホ関連',icon:'more',color:'#8e9e8b',bg:'#eef3eb',type:'expense'},
{id:'car',name:'自動車関連',icon:'train',color:'#789aaf',bg:'#eaf2f7',type:'expense'},
{id:'debit',name:'カード・引き落とし',icon:'card',color:'#8979a6',bg:'#f3eff8',type:'expense'},
{id:'other',name:'その他の支出',icon:'more',color:'#bfc5bc',bg:'#f0f2ee',type:'expense'},
{id:'salary',name:'給与',icon:'wallet',color:'#3e7a60',bg:'#eaf3e9',type:'income'},
{id:'side',name:'副収入',icon:'wallet',color:'#3e7a60',bg:'#eaf3e9',type:'income'},
{id:'bonus',name:'賞与',icon:'spark',color:'#3e7a60',bg:'#eaf3e9',type:'income'},
{id:'otherIncome',name:'その他の収入',icon:'wallet',color:'#3e7a60',bg:'#eaf3e9',type:'income'}];
const debitNames=['楽天カード支払い','楽天カード固定費','PayPay後払い','三井住友銀行固定費','Amazonカード','Olive支払い'];
const payments=['現金','クレジットカード','銀行口座','電子マネー','その他',...debitNames];
const empty=()=>({version:1,transactions:[],budgets:{},recurring:[],stocks:[],stockEvents:[]});
function validDate(s){if(typeof s!=='string'||!/^20\d{2}-\d{2}-\d{2}$|^2100-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s}
function validMonth(s){return typeof s==='string'&&/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(s)}
function shiftMonth(month,offset){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+offset,1));return d.toISOString().slice(0,7)}
function lastDay(month){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate()}
function monthRows(data,month){return data.transactions.filter(t=>t.date.startsWith(month))}
function summarize(data,month){const rows=monthRows(data,month);const income=rows.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);const expense=rows.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);const byCategory=Object.fromEntries(categories.filter(c=>c.type==='expense').map(c=>[c.id,rows.filter(t=>t.type==='expense'&&t.category===c.id).reduce((s,t)=>s+t.amount,0)]));const budget=Object.values(data.budgets[month]||{}).reduce((s,n)=>s+n,0);return{income,expense,balance:income-expense,byCategory,budget,remaining:budget-expense,count:rows.length}}
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
const validAmount=n=>Number.isSafeInteger(n)&&n>0&&n<=999999999;
function nextDebitDate(inputDate){if(!validDate(inputDate))return '';const value=shiftMonth(inputDate.slice(0,7),1)+'-27';return validDate(value)?value:''}
function parseDebitAmount(value){const text=String(value).normalize('NFKC').replace(/[,\s]/g,'');if(!/^\d+$/.test(text))return null;const amount=Number(text);return validAmount(amount)?amount:null}
function formatDebitAmount(value){const text=String(value).normalize('NFKC').replace(/[,\s]/g,'');return /^\d+$/.test(text)?text.replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,','):String(value)}
function validEntry(t){return t&&(t.isNisa===undefined||typeof t.isNisa==='boolean')&&(t.inputDate===undefined||t.inputDate===''||validDate(t.inputDate))&&validId(t.id)&&['income','expense'].includes(t.type)&&categories.some(c=>c.id===t.category&&c.type===t.type)&&validAmount(t.amount)&&typeof t.label==='string'&&t.label.length<=80&&typeof t.note==='string'&&t.note.length<=500&&payments.includes(t.payment)&&(!t.debit||(t.type==='expense'&&t.category==='debit'&&typeof t.debitAccount==='string'&&t.debitAccount.length<=80&&['planned','paid'].includes(t.debitStatus)))}
function validStockDetails(stock){return ['shares','dividendPerShare'].every(key=>stock[key]==null||Number.isFinite(stock[key])&&stock[key]>=0&&stock[key]<=999999999)&&['exDividendDate','dividendPaymentDate'].every(key=>stock[key]===undefined||stock[key]===''||validDate(stock[key]))}
function validStocks(d){
 const stocks=d.stocks??[],events=d.stockEvents??[];
 return Array.isArray(stocks)&&stocks.length<=5000&&stocks.every(s=>s&&validStockDetails(s)&&validId(s.id)&&typeof s.name==='string'&&s.name.trim()&&s.name.length<=100&&typeof s.kind==='string'&&s.kind.length>0&&s.kind.length<=40&&typeof s.note==='string'&&s.note.length<=500)&&new Set(stocks.map(s=>s.id)).size===stocks.length&&Array.isArray(events)&&events.length<=50000&&events.every(e=>e&&validId(e.id)&&stocks.some(s=>s.id===e.stockId)&&['dividend','sale'].includes(e.type)&&validDate(e.date)&&validAmount(e.amount)&&typeof e.kind==='string'&&e.kind.length<=40)&&new Set(events.map(e=>e.id)).size===events.length;
}
function migrate(input){if(!validate(input))throw Error('Invalid ledger');return {...input,stocks:input.stocks??[],stockEvents:input.stockEvents??[]}}
function validate(d){if(!d||!validStocks(d)||d.version!==1||!Array.isArray(d.transactions)||!Array.isArray(d.recurring)||d.transactions.length>50000||d.recurring.length>500||!d.budgets||typeof d.budgets!=='object'||Array.isArray(d.budgets))return false;
if(!d.transactions.every(t=>validEntry(t)&&validDate(t.date)&&(!t.occurrence||typeof t.occurrence==='string'&&/^[\w-]{1,100}@(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(t.occurrence)))||new Set(d.transactions.map(t=>t.id)).size!==d.transactions.length)return false;
if(!d.recurring.every(t=>validEntry(t)&&Number.isInteger(t.day)&&t.day>=1&&t.day<=31)||new Set(d.recurring.map(t=>t.id)).size!==d.recurring.length)return false;
return Object.entries(d.budgets).every(([month,limits])=>validMonth(month)&&limits&&typeof limits==='object'&&!Array.isArray(limits)&&Object.entries(limits).every(([id,n])=>categories.some(c=>c.id===id&&c.type==='expense')&&Number.isSafeInteger(n)&&n>=0&&n<=999999999))}
function isNisaContribution(row){if(row.type!=='expense')return false;if(typeof row.isNisa==='boolean')return row.isNisa;const label=String(row.label||'').normalize('NFKC').replace(/\s/g,'').toUpperCase();return /(?:積立|積み立て|つみたて|つみ立て)NISA|NISA.*(?:積立|積み立て|つみたて|つみ立て)/.test(label)}
function isInvestmentExpense(row){return row.type==='expense'&&(row.category==='investment'||isNisaContribution(row))}
function fixedCostSummary(data){const income=data.recurring.filter(row=>row.type==='income').reduce((sum,row)=>sum+row.amount,0),expenses=data.recurring.filter(row=>row.type==='expense'),allExpense=expenses.reduce((sum,row)=>sum+row.amount,0),investmentExpense=expenses.filter(isInvestmentExpense).reduce((sum,row)=>sum+row.amount,0),expense=allExpense-investmentExpense,excludedNisa=expenses.filter(isNisaContribution).reduce((sum,row)=>sum+row.amount,0),lineExpense=expense;return {income,expense,allExpense,investmentExpense,excludedNisa,lineExpense,variableLimit:income-allExpense,incomeThird:income/3,incomeHalf:income/2,lineDifference:(lineExpense*3-income)/3,preservationDifference:(lineExpense*2-income)/2,hasIncome:income>0,wealthLine:income>0&&lineExpense*3<income,preservationLine:income>0&&lineExpense*2<income}}


function applyRecurring(data,month,idFactory){let added=0;for(const rule of data.recurring){const occurrence=rule.id+'@'+month;if(data.transactions.some(t=>t.occurrence===occurrence))continue;const {day,...fields}=rule;data.transactions.push({...fields,id:idFactory(),date:month+'-'+String(Math.min(day,lastDay(month))).padStart(2,'0'),occurrence});added++}return added}
root.Ledger={categories,debitNames,payments,empty,validDate,validMonth,shiftMonth,lastDay,monthRows,summarize,validAmount,nextDebitDate,parseDebitAmount,formatDebitAmount,validStockDetails,validStocks,migrate,validate,isNisaContribution,isInvestmentExpense,fixedCostSummary,applyRecurring};
})(typeof module!=='undefined'?module.exports:window);

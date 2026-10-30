(function(root){'use strict';
const statuses={finished:'読了',want:'読みたい'},genres=['少年漫画','青年漫画','少女漫画','女性漫画','その他'],formats=['レンタル','紙','電子書籍','紙・電子の両方'],ratingLabels=['物語','キャラ','作画','世界観','読後感'];
const publishers=['集英社','講談社','小学館','スクエアエニックス'];
const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000,score=n=>n===null||Number.isInteger(n)&&n>=1&&n<=5;
function average(ratings){const entered=ratings.filter(n=>n!==null);return entered.length?entered.reduce((sum,n)=>sum+n,0)/entered.length:null}
function commonBook(b){return !!(b&&typeof b.id==='string'&&/^[\w-]{1,100}$/.test(b.id)&&typeof b.title==='string'&&b.title.trim()&&b.title.length<=120&&typeof b.author==='string'&&b.author.length<=100&&genres.includes(b.genre)&&['reading','want','finished','paused'].includes(b.status)&&integer(b.readVolumes)&&(b.totalVolumes===null||integer(b.totalVolumes)&&b.totalVolumes>0&&b.readVolumes<=b.totalVolumes)&&typeof b.seriesComplete==='boolean'&&typeof b.favorite==='boolean'&&typeof b.note==='string'&&b.note.length<=2000&&Number.isFinite(b.createdAt)&&Number.isFinite(b.updatedAt))}
function validBook(b,legacy=false){return commonBook(b)&&(legacy===true||Object.hasOwn(statuses,b.status))&&((legacy===true&&b.publisher===undefined)||b.publisher===''||publishers.includes(b.publisher))&&formats.includes(b.format)&&Array.isArray(b.ratings)&&b.ratings.length===5&&b.ratings.every(score)&&b.rating===average(b.ratings)&&(b.previousRating===undefined||score(b.previousRating))&&(b.ownedVolumes===undefined||integer(b.ownedVolumes))}
function validList(d,version,validator){return !!(d&&d.version===version&&Array.isArray(d.books)&&d.books.length<=5000&&d.books.every(book=>validator(book))&&new Set(d.books.map(b=>b.id)).size===d.books.length)}
function validate(d){return validList(d,3,validBook)}
function migrate(input){
 if(input?.version===3){if(!validate(input))throw Error('Invalid manga backup');return JSON.parse(JSON.stringify(input))}
 let previous;
 if(input?.version===2){if(!validList(input,2,book=>validBook(book,true)))throw Error('Invalid manga backup');previous=JSON.parse(JSON.stringify(input))}
 else{if(!validList(input,1,b=>commonBook(b)&&['紙','電子書籍','紙・電子の両方','レンタル・借り物'].includes(b.format)&&integer(b.ownedVolumes)&&(b.totalVolumes===null||b.ownedVolumes<=b.totalVolumes)&&score(b.rating)))throw Error('Invalid manga backup');previous={books:input.books.map(b=>({...b,format:b.format==='レンタル・借り物'?'レンタル':b.format,previousRating:b.rating,ratings:Array(5).fill(null),rating:null}))}}
 const result={...previous,version:3,books:previous.books.map(b=>({...b,publisher:b.publisher||'',...(['reading','paused'].includes(b.status)?{previousStatus:b.status,status:'want'}:{})}))};if(!validate(result))throw Error('Invalid manga backup');return result;
}
const empty=()=>({version:3,books:[]});
function select(books,{view='all',query='',genre='',sort='updated'}={}){const q=query.trim().normalize('NFKC').toLocaleLowerCase('ja');return books.filter(b=>(view==='all'||view==='favorite'&&b.favorite||b.status===view)&&(!genre||b.genre===genre)&&(!q||[b.title,b.author,b.publisher,b.note].join(' ').normalize('NFKC').toLocaleLowerCase('ja').includes(q))).slice().sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'ja'):sort==='rating'?(b.rating||0)-(a.rating||0)||b.updatedAt-a.updatedAt:b.updatedAt-a.updatedAt)}
function readNext(book,now=Date.now()){if(book.totalVolumes!==null&&book.readVolumes>=book.totalVolumes)return book;const readVolumes=book.readVolumes+1;if(!integer(readVolumes))return book;return {...book,readVolumes,status:book.totalVolumes!==null&&readVolumes===book.totalVolumes?'finished':'want',updatedAt:now}}
function summary(books){return {total:books.length,read:books.reduce((sum,b)=>sum+b.readVolumes,0),want:books.filter(b=>b.status==='want').length}}
function ranking(books,kind='overall'){if(kind!=='overall'&&!/^[0-4]$/.test(String(kind)))throw Error('Invalid ranking');const entries=books.map(book=>({book,score:kind==='overall'?book.rating:book.ratings[Number(kind)]})).filter(entry=>entry.score!==null).sort((a,b)=>b.score-a.score||b.book.updatedAt-a.book.updatedAt||a.book.title.localeCompare(b.book.title,'ja'));let rank=0;return entries.map((entry,index)=>{if(index===0||entry.score!==entries[index-1].score)rank=index+1;return {...entry,rank}})}
const api={ranking,publishers,statuses,genres,formats,ratingLabels,average,validBook,validate,migrate,empty,select,readNext,summary};if(typeof module!=='undefined')module.exports=api;else root.MangaModel=api;
})(globalThis);

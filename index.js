const path=require('path');
const express=require('express');
const fs=require('fs');
const app=express();
const dir = path.join(__dirname, 'public');
app.use(express.static(dir));
const bodyparser=require('body-parser');
app.use(bodyparser.urlencoded({extended:true}));

app.set('view engine','ejs');

class UserRepository{
    constructor(filename){
        //constructor can't have asynchronous function inside it so we used synchronous method accessSync

        if(!filename){
            throw new Error("Creating a repo reqires a file name");

        }
        this.filename=filename;
        try{
            fs.accessSync(this.filename);
        }catch(err){
            fs.writeFileSync(this.filename,"[]");
        }
    }

    async getAll(){
            return JSON.parse(await fs.promises.readFile(this.filename,{encoding:'utf8'}));

    }

    async update(record){
        const date_ob = new Date();
         const date = ("0" + date_ob.getDate()).slice(-2);
         const month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
         const year = date_ob.getFullYear();

         record.date=`${year}-${month}-${date}`;
        const records=await this.getAll();
        records.push(record);
        await this.writeAll(records);
    } 

    async writeAll(records){
        await fs.promises.writeFile(this.filename,JSON.stringify(records,null,2));

    }

    async delete_event(e){
        
        
        const records=await this.getAll();
        const filterRecords=records.filter(record=>record.description!==e.description)
        console.log(filterRecords);

        //.filter method returns the record for which inner condition is true
    
        await  this.writeAll(filterRecords);
        
    }

   
}

const messages=new UserRepository('messages.json');
const upevents=new UserRepository('upevents.json');
const pastevents=new UserRepository('pastevents.json')

function compareTime(str1, str2){
    if(str1 === str2){
        return 0;
    }
    var time1 = str1.split(':');
    var time2 = str2.split(':');
    if(eval(time1[0]) > eval(time2[0])){
        return 1;
    } else if(eval(time1[0]) == eval(time2[0]) && eval(time1[1]) > eval(time2[1])) {
        return 1;
    } else {
        return -1;
    }
}
const dates = {
    convert:function(d) {
        // Converts the date in d to a date-object. The input can be:
        //   a date object: returned without modification
        //  an array      : Interpreted as [year,month,day]. NOTE: month is 0-11.
        //   a number     : Interpreted as number of milliseconds
        //                  since 1 Jan 1970 (a timestamp) 
        //   a string     : Any format supported by the javascript engine, like
        //                  "YYYY/MM/DD", "MM/DD/YYYY", "Jan 31 2009" etc.
        //  an object     : Interpreted as an object with year, month and date
        //                  attributes.  **NOTE** month is 0-11.
        return (
            d.constructor === Date ? d :
            d.constructor === Array ? new Date(d[0],d[1],d[2]) :
            d.constructor === Number ? new Date(d) :
            d.constructor === String ? new Date(d) :
            typeof d === "object" ? new Date(d.year,d.month,d.date) :
            NaN
        );
    },
    compare:function(a,b) {
        // Compare two dates (could be of any type supported by the convert
        // function above) and returns:
        //  -1 : if a < b
        //   0 : if a = b
        //   1 : if a > b
        // NaN : if a or b is an illegal date
        // NOTE: The code inside isFinite does an assignment (=).
        return (
            isFinite(a=this.convert(a).valueOf()) &&
            isFinite(b=this.convert(b).valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
    }
};

app.set('view-engine','ejs');
app.get('/',(req,res)=>{
    res.render('home.ejs');
});


app.get('/contact',(req,res)=>{
    res.render('contact.ejs');
});

app.post('/contact',async (req,res)=>{
    
    await messages.update(req.body);
    res.redirect('/');
    
    //records.push(record);
    //await fs.promises.appendFile('messages.json',JSON.stringify(record,null,2));


    
});

app.get('/messages',async (req,res)=>{
    const msg= await messages.getAll();
    res.render('messages.ejs',{msg:msg});

});

app.get('/newEvent',(req,res)=>{
    res.render('newEvent');
});

app.post('/newEvent',async (req,res)=>{
    const newEvent=req.body;
    await upevents.update(newEvent);
    res.redirect('/upevents');
    
})

app.get('/events',async (req,res)=>{
        
        res.render('events.ejs');
    });

app.get('/comittee',(req,res)=>{

    res.render('comittee');
});

app.get('/upevents',async (req,res)=>{
    
    const eventObject=await upevents.getAll();
    if(eventObject.length===0)
        res.render('EventNotFound.ejs');
    else
        res.render('upevents.ejs',{up:eventObject});
    
})

app.get('/pastevents',async (req,res)=>{
    const date_o = new Date();
         const date = ("0" + date_o.getDate()).slice(-2);
         const month = ("0" + (date_o.getMonth() + 1)).slice(-2);
         const year = date_o.getFullYear();

         current_date=`${year}-${month}-${date}`;

         const d = new Date();
         const curr_hour = d.getHours();
         const curr_min = d.getMinutes();
         const current_time=`${curr_hour}:${curr_min}`;

         
    const records=await upevents.getAll();
    for(let e of records){
  

     if(dates.compare(e.event_date,current_date)===-1){
           await upevents.delete_event(e);
           await pastevents.update(e);
     }else if(dates.compare(e.event_date,current_date)===0){
          
       
        
        if(compareTime(current_time,e.time)===1)
        {   
            await upevents.delete_event(e);
            await pastevents.update(e);
        }
        
      }
    }
    const q=await pastevents.getAll();  
    if(q.length===0)
        res.render('EventNotFound.ejs');
    else
    res.render('pastevents.ejs',{past:q});


})
app.listen(5500,function(){
    console.log("listening");
});
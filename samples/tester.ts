const diff = (a: number, b: number): number => {
    if (a <= b){
        a -= b;
        return a;  
    } else {
        b -= a; 
        return b; 
    }
}

console.log(diff(3, 4));

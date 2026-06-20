export const PRACTICALS_DATA = `COMPUTER SCIENCE PRACTICALS 2026-27

PROGRAM 1: Write a Python Program to enter two numbers and print the arithmetic operations like +, -, *, /, // and %.
result = 0
while True:
    val1 = float(input("Enter the first value :"))
    val2 = float(input("Enter the second value :"))
    op = input("Enter any one of the operator (+,-,*,/,//,%)")
    if op == "+":
        result = val1 + val2
    elif op == "-":
        result = val1 - val2
    elif op == "*":
        result = val1 * val2
    elif op == "/":
        if val2 == 0:
            print("Please enter a value other than 0")
        else:
            result = val1 / val2
    elif op == "//":
        result = val1 // val2
    else:
        result = val1 % val2
    print("The result is :",result)
    x=input("do you want to continue ")
    if x=='n':
        break

PROGRAM 2: Write a Python Program to enter the number of terms and to print the Fibonacci Series.
n =int(input("Enter the limit:"))
x = -1
y = 1
z = 0
i=0
print("Fibonacci series :\\n")
while(i<n):
    print(z, end=" ")
    x = y
    y = z
    z = x + y
    i=i+1

PROGRAM 3: Write a menu driven Python program to calculate Area of triangle, Area of a circle, and Area of Rectangle.
while True:
    print('1.Area of triangle')
    print('2.Area of Circle')
    print('3.Area of Rectangle')
    choice=int(input('Enter the choice'))
    if(choice==1):
        b=int(input('Enter the base'))
        h=int(input('Enter the height'))
        Area=0.5*b*h
        print('Area of triangle is', Area)
    elif(choice==2):
        r=int(input('Enter the radius'))
        Area=3.14*r*r
        print('the area of the circle is', Area)
    elif(choice==3):
        l=int(input('enter the length'))
        b=int(input('enter the breadth'))
        Area=l*b
        print('The Area of the Rectangle is ', Area)
    else:
        print('Wrong input')
    c=input('Do you want to continue?')
    if c=='n':
        break

PROGRAM 4: Write a menu driven program to find the factorial of given number and sum of list elements.
while True:
    print("1.Factorial")
    print("2.Sum of Elements in the list")
    ch=int(input("Enter your choice"))
    if ch==1:
        n=int(input("Enter the number of terms to find the factorial"))
        f=1
        for i in range(1,n+1):
            f=f*i
        print("Factorial of given number is ", f)
    elif ch==2:
        n=eval(input("Enter the list"))
        s=0
        for i in n:
            s=s+i
        print("The sum of series",s)
    con=input("Do you want to continue")
    if con=='n':
        break

PROGRAM 5: Write a Program to check if the entered number is Armstrong or not.
no=int(input("Enter any number to check : "))
no1=no
sum=0
while(no>0):
    ans=no%10
    sum=sum+(ans*ans*ans)
    no=int(no/10)
if sum==no1:
    print("Armstrong Number")
else:
    print("Not an Armstrong Number")

PROGRAM 6: Write a Python program to check the given string if palindrome or not.
a=input("Enter the String")
b=""
l=len(a)
for i in range(l-1,-1,-1):
    b+=a[i]
if a==b:
    print("Given string is palindrome")
else:
    print("The given string is not palindrome")

PROGRAM 7: Write a Python program to count number of character, number of upper case and lower case letters in a given string.
st=input("Enter the string")
up=0
lc=0
Chr=0
for i in range(len(st)):
    Chr=Chr+1
    if st[i].isupper()==True:
        up=up+1
    elif st[i].islower()==True:
        lc=lc+1
print("Number of upper case letter",up)
print("Number of lower case letter",lc)
print("Number of character ",Chr)

PROGRAM 8: Write a Python program to print largest even and largest odd number in the list without using built - in functions.
a=eval(input("Enter a List"))
odd=[]
even=[]
for i in a:
    if i%2==0:
        even.append(i)
    else:
        odd.append(i)
if even==[]:
    print("No even number")
else:
    print("The largest even number is",max(even))
if odd==[]:
    print("No odd number")
else:
    print("The largest odd number is ",max(odd))

PROGRAM 9: Write a Python Program to perform Linear Search on list.
l=eval(input("Enter the list elements"))
s=eval(input("Enter the element to be searched"))
b=0
for i in range(len(l)):
    if l[i]==s:
        print("The element found in the index",i,"position",i+1)
        b=1
if b==0:
    print("element not found")

PROGRAM 10: Python Program to read and write the content to/from the text file and count number of lines start with mentioned letter entered by the user.
f=open("file.txt", 'w')
char="Text files store data in ascii format.\\nHuman readable form.\\nAt lowest level text file is a collection of bytes"
f.write(char)
f.close()

f=open("file.txt",'r')
x=f.readlines()
count=0
s=0
ser=input("Enter the search letter")
for i in x:
    if i[0]==ser:
        count+=1
        s=1
if s==0:
    print("The letter not found")
else:
    print("No of line starts with", ser, "is", count)
f.close()

PROGRAM 11: Program to find the number of occurrences of the given word using text files.
f=open("file.txt", 'w')
char="Seek() function is used to change the position of the file handle to a given specific position.\\nTell() returns the current position of the file read/write pointer within the file"
f.write(char)
f.close()

f=open("file.txt",'r')
x=f.read()
y=x.split()
count=0
s=0
ser=input("Enter the search word")
for i in y:
    if i==ser:
        count+=1
        s=1
if s==0:
    print("The given word not found")
else:
    print("No of time the word ",ser,"occured is", count)
f.close()

PROGRAM 12: Write and Read operations in Binary files using Pickle Module.
import pickle
f=open("library.dat", 'wb')
while True:
    Bno=int(input("Enter the Book number"))
    Bname=input("Enter the name of the book")
    Bprice=int(input("Enter the Price"))
    info=[Bno, Bname, Bprice]
    pickle.dump(info,f)
    ch=input("Do you want to continue adding records(y/n)")
    if ch.upper()=='N':
        break
f.close()

with open("library.dat", 'rb')as f:
    while True:
        try:
            r=pickle.load(f)
            print(r)
        except:
            break

PROGRAM 13: Writing the data and Searching for a particular records in binary file using pickle module.
import pickle
f=open("library.dat",'wb')
while True:
    Bno=int(input("Enter the Book number"))
    Bname=input("Enter the name of the book")
    Bprice=int(input("enter the Price"))
    info=[Bno, Bname, Bprice]
    pickle.dump(info,f)
    ch=input("Do you want to continue adding records(y/n)")
    if ch.upper()=='N':
        break
f.close()

with open("library.dat", 'rb')as f:
    n=int(input("Enter the no to be searched"))
    while True:
        try:
            r=pickle.load(f)
            if r[0]==n:
                print(r)
        except:
            break

PROGRAM 14: Writing the records in CSV files and count number of records in the file.
import csv
f=open("emp.csv", 'w', newline="")
csvw=csv.writer(f)
while True:
    Eno=int(input("Enter the Employee number"))
    Ename=input("Enter the name of the Employee")
    Esal=int(input("Enter the Esal"))
    Desig=input("Enter the Designation")
    info=[Eno, Ename, Esal, Desig]
    csvw.writerow(info)
    ch=input("Do you want to continue adding records(y/n)")
    if ch.upper()=='N':
        break
f.close()

c=0
f=open("emp.csv",'r')
csvr=csv.reader(f)
for i in csvr:
    c=c+1
    print(i)
f.close()
print("Number of records in file is",c)

PROGRAM 15: PUSH and POP operation in stack using list.
stack=[]
def PUSH(item, stack):
    stack.append(item)

def POP(stack):
    if stack==[]:
        print("Stack is empty")
    else:
        p=stack.pop()
        print("Deleted element", p)

def DISPLAY(stack):
    if stack==[]:
        print("stack is empty")
    else:
        for i in range (len(stack)-1,-1,-1):
            print(stack[i])

while True:
    print("1.Push\\n2.Pop\\n3.Display")
    n=int(input("Enter the operation"))
    if n==1:
        a=int(input("Enter no"))
        PUSH(a,stack)
    elif n==2:
        POP(stack)
    elif n==3:
        DISPLAY(stack)
    con=input("Do you want to continue")
    if con=='n':
        break

PROGRAM 16: Python with MySQL connectivity - creating connection & Table.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()

mycursor.execute("DROP DATABASE IF EXISTS student")
mycursor.execute("CREATE DATABASE student")
mycursor.execute("USE student")

mycursor.execute("DROP TABLE IF EXISTS studentinfo")
mycursor.execute("CREATE TABLE studentinfo (name VARCHAR(30), age INT(3), gender CHAR(1))")

sql = """INSERT INTO studentinfo(name, age, gender) VALUES(%s, %s, %s)"""
rows = [('Amit', 18, 'M'), ('Sudha', 17, 'F'), ('Suma', 19, 'F'), ('Paresh', 19, 'M'), ('Ali', 17,'M')]
mycursor.executemany(sql, rows)
con.commit()

sql = "SELECT * FROM studentinfo"
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    age = row[1]
    gender = row[2]
    print("Name=%s, Age=%s, Gender=%s" % (name, age, gender))
con.close()

PROGRAM 17: Python with MySQL connectivity - updating records.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()

mycursor.execute("USE student")
mycursor.execute("DROP TABLE IF EXISTS result")
mycursor.execute("CREATE TABLE result (name VARCHAR(30), phys INT(3), chem INT(3), math INT(3))")

sql = """INSERT INTO result(name, phys, chem, math) VALUES(%s, %s, %s, %s)"""
rows = [('Amit', 70,76,80), ('Sudha',80,85,90), ('Suma',50,70,90), ('Paresh',55,60,70), ('Ali', 80,70,75), ('Gargi', 80,60,80)]
mycursor.executemany(sql, rows)
con.commit()

sql = "UPDATE result SET math=math+5 WHERE name='%s'" % ('Sudha')
mycursor.execute(sql)

sql = "SELECT * FROM result"
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    p = row[1]
    c = row[2]
    m = row[3]
    print("Name=%s, Phys=%d, Chem=%d, Math=%d" % (name,p,c,m))
con.close()

PROGRAM 18: Python with MySQL connectivity - deleting records.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()
mycursor.execute("USE student")

sql = "DELETE FROM result WHERE math>=%d" % (90)
mycursor.execute(sql)

sql = "SELECT * FROM result"
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    p = row[1]
    c = row[2]
    m = row[3]
    print("Name=%s, Phys=%s, Chem=%s, Math=%s" % (name, p,c,m))
con.close()

PROGRAM 19: Python with MySQL connectivity -fetch all command.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()
mycursor.execute("USE student")

mycursor.execute("DROP TABLE IF EXISTS staff")
mycursor.execute("CREATE TABLE staff (name VARCHAR(30), desg VARCHAR(10), subject VARCHAR(10), salary INT(5))")

sql = """INSERT INTO staff(name, desg, subject, salary) VALUES(%s, %s, %s, %s)"""
rows = [('Amit', 'PGT', 'CHEM', 8000), ('Sudha', 'HDM', 'BIOL', 8500), ('Suma', 'TGT', 'MATH', 9000), ('Paresh', 'PGT', 'HIND', 7000), ('Ali', 'PRT', 'COMM', 7500), ('Gargi', 'PGT', 'COMP',9000)]
mycursor.executemany(sql, rows)
con.commit()

sql = "SELECT * FROM staff WHERE salary>'%d'" % (8000)
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    des = row[1]
    sub = row[2]
    sal = row[3]
    print("Name=%s, Desg=%s, subject=%s, Salary=%s" % (name,des, sub,sal))
con.close()

PROGRAM 20: Execute the SQL commands and queries.
Create table employee (empno varchar(25) primary key, ename varchar(25), department varchar(25), salary int);

Insert into employee values('e034','snigdha sadu','sales', 35000);
Insert into employee values('e089','rekha sao', 'hr', 65000);
Insert into employee values('e112', 'shweta jagtap','marketing', 45000);
Insert into employee values('e123', 'ankush das', 'sales', 40000);
Insert into employee values('e245','neeraj kapoor','finance', 55000);

Select * from employee;
Select * from employee where department ='sales';
Select * from employee where department in ('sales', 'hr','marketing');
Select * from employee where ename like 's%';
Select * from employee order by salary desc;
Select department, count(*) from employee group by department;
Select count(*) from employee;
update employee set salary = salary +5000 where empno='e123';
delete from employee where empno='e034';
`;

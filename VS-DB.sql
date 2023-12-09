Create database vshootDB;
Use vshootDB;

create table Users (
	userId int(11) primary key auto_increment,
    pin varchar(300),
    pinCreationDate varchar(300),
    email varchar(30),
    username varchar(20) not null unique,
    uPassword varchar(300) not null,
    profilePic varchar(300),
    vsPreference int(6),
    deviceToken varchar(300)
);

create table VShoots(
	vsID int(11) primary key auto_increment,
	startTime varchar(30) not null,
    endTime varchar(30) not null,
    vmodel int(11) not null, #should be a foreign key
    votographer int(11) not null, #should be a foreign key
    FOREIGN KEY (vmodel) REFERENCES Users(userId),
    FOREIGN KEY (votographer) REFERENCES Users(userId)
);

create table Friends(
	friendshipID int(11) primary key auto_increment,
	friend1 int(11) not null, #FRIEND WHO OPTED TO ADD FRIEND2
    friend2 int(11) not null, #FRIEND2 DOES NOT AUTOMATICALLY HAVE FRIEND1 ADDED TO THEIR VFRIENDS
    FOREIGN KEY (friend1) REFERENCES Users(userId), #should be a foreign key
    FOREIGN KEY (friend2) REFERENCES Users(userId) #should be a foreign key
);

create table VGroups (
	groupId int(11) primary key auto_increment,
    gName varchar(300) not null unique,
    gDescription varchar(300),
    creator int(11),
    Foreign key(creator) References Users(userId)
);

create table VGroupMembers (
	memberId int(11) primary key auto_increment,
    userId int(11),
    Foreign key(userId) References Users(userId),
   groupName varchar (100)
);

create table Messages (
	messageId int(11) primary key auto_increment,
    sender int(11),
    Foreign key(sender) References Users(userId),
    message varchar(500),
    groupName varchar(100),
    sentdate varchar(100)
);

ALTER TABLE
    Messages
    CONVERT TO CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

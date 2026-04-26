IF OBJECT_ID(N'dbo.LSOpportunityChatSetup', N'U') IS NULL
BEGIN
	CREATE TABLE dbo.LSOpportunityChatSetup
	(
		CompanyID INT NOT NULL,
		SetupID NVARCHAR(10) NOT NULL,
		N8nWebhookUrl NVARCHAR(2048) NULL,
		N8nClientSecret NVARCHAR(255) NULL,
		NoteID UNIQUEIDENTIFIER NULL,
		CreatedByID UNIQUEIDENTIFIER NULL,
		CreatedByScreenID CHAR(8) NULL,
		CreatedDateTime DATETIME NULL,
		LastModifiedByID UNIQUEIDENTIFIER NULL,
		LastModifiedByScreenID CHAR(8) NULL,
		LastModifiedDateTime DATETIME NULL,
		tstamp ROWVERSION NOT NULL,
		CONSTRAINT PK_LSOpportunityChatSetup PRIMARY KEY CLUSTERED (CompanyID, SetupID)
	);
END;

IF OBJECT_ID(N'dbo.LSOpportunityChatSession', N'U') IS NULL
BEGIN
	CREATE TABLE dbo.LSOpportunityChatSession
	(
		CompanyID INT NOT NULL,
		ChatSessionID INT IDENTITY(1,1) NOT NULL,
		OpportunityID NVARCHAR(15) NOT NULL,
		Subject NVARCHAR(255) NULL,
		LastMessageDateTime DATETIME NULL,
		NoteID UNIQUEIDENTIFIER NULL,
		CreatedByID UNIQUEIDENTIFIER NULL,
		CreatedByScreenID CHAR(8) NULL,
		CreatedDateTime DATETIME NULL,
		LastModifiedByID UNIQUEIDENTIFIER NULL,
		LastModifiedByScreenID CHAR(8) NULL,
		LastModifiedDateTime DATETIME NULL,
		tstamp ROWVERSION NOT NULL,
		CONSTRAINT PK_LSOpportunityChatSession PRIMARY KEY CLUSTERED (CompanyID, ChatSessionID)
	);
END;

IF OBJECT_ID(N'dbo.LSOpportunityChatMessage', N'U') IS NULL
BEGIN
	CREATE TABLE dbo.LSOpportunityChatMessage
	(
		CompanyID INT NOT NULL,
		ChatMessageID INT IDENTITY(1,1) NOT NULL,
		ChatSessionID INT NOT NULL,
		MessageDateTime DATETIME NULL,
		Role CHAR(1) NOT NULL,
		MessageText NTEXT NULL,
		CreatedByID UNIQUEIDENTIFIER NULL,
		CreatedByScreenID CHAR(8) NULL,
		CreatedDateTime DATETIME NULL,
		LastModifiedByID UNIQUEIDENTIFIER NULL,
		LastModifiedByScreenID CHAR(8) NULL,
		LastModifiedDateTime DATETIME NULL,
		tstamp ROWVERSION NOT NULL,
		CONSTRAINT PK_LSOpportunityChatMessage PRIMARY KEY CLUSTERED (CompanyID, ChatMessageID)
	);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LSOpportunityChatSession_OpportunityID' AND object_id = OBJECT_ID(N'dbo.LSOpportunityChatSession'))
BEGIN
	CREATE UNIQUE NONCLUSTERED INDEX IX_LSOpportunityChatSession_OpportunityID
	ON dbo.LSOpportunityChatSession (CompanyID, OpportunityID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LSOpportunityChatMessage_Session' AND object_id = OBJECT_ID(N'dbo.LSOpportunityChatMessage'))
BEGIN
	CREATE NONCLUSTERED INDEX IX_LSOpportunityChatMessage_Session
	ON dbo.LSOpportunityChatMessage (CompanyID, ChatSessionID, MessageDateTime, ChatMessageID);
END;
